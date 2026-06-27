import json
import time
import redis
from kafka import KafkaConsumer
import os
r = redis.Redis(host=os.environ.get('REDIS_HOST', 'localhost'), port=6379, decode_responses=True)

consumer = KafkaConsumer(
    'inventory-events',
    bootstrap_servers=os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
    group_id='flashlock-consumers-v2',
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    auto_offset_reset='latest'
)

def acquire_lock(sku, ttl=10):
    """Try to acquire lock for this SKU. Returns True if got it, False if not."""
    lock_key = f"lock:{sku}"
    result = r.set(lock_key, "locked", nx=True, ex=ttl)
    return result is True

def release_lock(sku):
    """Release the lock for this SKU."""
    r.delete(f"lock:{sku}")

def get_stock(sku):
    """Get current stock for this SKU."""
    stock = r.hget(f"inventory:{sku}", "stock")
    return int(stock) if stock else 0

def decrement_stock(sku):
    """Atomically decrement stock by 1."""
    return r.hincrby(f"inventory:{sku}", "stock", -1)

def process_event(event):
    """The core logic — lock, check, decrement or reject, release."""
    sku = event['sku']
    user_id = event['user_id']
    event_id = event['event_id']

    if not acquire_lock(sku):
        print(f"[REJECTED] {event_id} — could not acquire lock for {sku}")
        return

    try:
        stock = get_stock(sku)

        if stock <= 0:
            print(f"[OUT OF STOCK] {event_id} — {sku} has no stock left")
            return

        new_stock = decrement_stock(sku)
        print(f"[SOLD] {event_id} — {sku} sold to {user_id}. Stock remaining: {new_stock}")

    finally:
        release_lock(sku)

def main():
    print("Consumer started. Waiting for events...")
    print("Make sure Redis has inventory set. Run this first in redis-cli:")
    print("  HSET inventory:iphone15 stock 10")
    print()

    for message in consumer:
        event = message.value
        process_event(event)

if __name__ == "__main__":
    main()