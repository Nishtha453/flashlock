from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import redis
from psycopg2 import pool
import uuid

app = FastAPI(title="FlashLock API")

redis_pool = redis.ConnectionPool(
    host='127.0.0.1', port=6379, decode_responses=True,
    max_connections=50
)
r = redis.Redis(connection_pool=redis_pool)

pg_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=20,
    host='127.0.0.1',
    port=5433,
    dbname='flashlock_db',
    user='flashlock',
    password='flashlock_dev'
)

class CartAddRequest(BaseModel):
    sku: str
    user_id: str

class SaleStartRequest(BaseModel):
    sku: str
    stock: int

def acquire_lock(sku, timeout=5):
    return r.set(f"lock:{sku}", "locked", nx=True, ex=timeout)

def release_lock(sku):
    r.delete(f"lock:{sku}")

@app.get("/inventory/{sku}")
def get_inventory(sku: str):
    stock = r.hget(f"inventory:{sku}", "stock")
    if stock is None:
        raise HTTPException(status_code=404, detail="SKU not found")
    return {"sku": sku, "stock": int(stock)}

@app.post("/cart/add")
def add_to_cart(req: CartAddRequest):
    sku = req.sku
    user_id = req.user_id

    if r.hget(f"inventory:{sku}", "stock") is None:
        raise HTTPException(status_code=404, detail="SKU not found")
    new_stock = r.hincrby(f"inventory:{sku}", "stock", -1)
    if new_stock < 0:
        r.hincrby(f"inventory:{sku}", "stock", 1)
        status = "rejected"
    else:
        status = "sold"
    event_id = f"evt_{uuid.uuid4().hex[:8]}"
    conn = pg_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO events (event_id, sku, user_id, status) VALUES (%s, %s, %s, %s)",
            (event_id, sku, user_id, status)
        )
        conn.commit()
        cur.close()
    finally:
        pg_pool.putconn(conn)

    return {"event_id": event_id, "sku": sku, "status": status}

@app.get("/oversells")
def get_oversells():
    conn = pg_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, sku, redis_stock, detected_at FROM oversell_incidents ORDER BY detected_at DESC")
        rows = cur.fetchall()
        cur.close()
    finally:
        pg_pool.putconn(conn)
    return {"oversells": [
        {"id": row[0], "sku": row[1], "redis_stock": row[2], "detected_at": str(row[3])}
        for row in rows
    ]}

@app.post("/sale/start")
def start_sale(req: SaleStartRequest):
    r.hset(f"inventory:{req.sku}", "stock", req.stock)
    return {"sku": req.sku, "stock": req.stock, "message": "Sale started"}

@app.post("/sale/reset")
def reset_sale(req: SaleStartRequest):
    r.hset(f"inventory:{req.sku}", "stock", req.stock)
    return {"sku": req.sku, "stock": req.stock, "message": "Sale reset"}