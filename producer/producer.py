import json
import time
import uuid
import random
from kafka import KafkaProducer

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

TOPIC = 'inventory-events'
SKU = 'iphone15'

def generate_event():
    """Creates one fake 'Buy Now' click as a dictionary."""
    return {
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "sku": SKU,
        "user_id": f"u_{random.randint(1000, 9999)}",
        "quantity": 1,
        "timestamp": time.time()
    }

def main():
    print("Starting producer... sending 20 events.")
    for i in range(20):
        event = generate_event()
        producer.send(
            TOPIC,
            key=event["sku"].encode('utf-8'),
            value=event
        )
        print(f"Sent: {event['event_id']} for {event['sku']} by {event['user_id']}")
        time.sleep(0.2)

    producer.flush()
    print("Done.")

if __name__ == "__main__":
    main()