import time
import redis
import psycopg2

r = redis.Redis(host='127.0.0.1', port=6379, decode_responses=True)

def get_pg_connection():
    return psycopg2.connect(
        host='127.0.0.1',
        port=5433,
        dbname='flashlock_db',
        user='flashlock',
        password='flashlock_dev'
    )

def reconcile():
    """Sync Redis stock to Postgres. Detect and log any oversell."""
    keys = r.keys('inventory:*')

    conn = get_pg_connection()
    cur = conn.cursor()

    for key in keys:
        sku = key.split(':')[1]
        stock = int(r.hget(key, 'stock'))

        if stock < 0:
            cur.execute(
                "INSERT INTO oversell_incidents (sku, redis_stock) VALUES (%s, %s)",
                (sku, stock)
            )
            print(f"[OVERSELL DETECTED] {sku} stock is {stock}")

        cur.execute(
            """
            INSERT INTO inventory (sku, stock, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (sku)
            DO UPDATE SET stock = EXCLUDED.stock, updated_at = NOW()
            """,
            (sku, stock)
        )
        print(f"[SYNC] {sku} -> Postgres stock = {stock}")

    conn.commit()
    cur.close()
    conn.close()

def main():
    print("Reconciliation job started. Syncing every 30 seconds...")
    while True:
        try:
            reconcile()
        except Exception as e:
            print(f"[ERROR] Reconciliation failed: {e}")
        time.sleep(30)

if __name__ == "__main__":
    main()