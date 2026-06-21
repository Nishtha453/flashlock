import json
import time
import uuid
import random
from kafka import KafkaProducer

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    batch_size=32768,
    linger_ms=0
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

def throughput_test(num_events=5000):
    """Sends a burst of events as fast as possible, measures real throughput."""
    print(f"Sending {num_events} events as fast as possible...")
    start_time = time.time()

    for i in range(num_events):
        event = generate_event()
        producer.send(
            TOPIC,
            key=event["sku"].encode('utf-8'),
            value=event
        )

    producer.flush()  
    end_time = time.time()

    duration = end_time - start_time
    rate = num_events / duration

    print(f"\nSent {num_events} events in {duration:.2f} seconds")
    print(f"Throughput: {rate:.0f} events/sec")

if __name__ == "__main__":
    throughput_test(5000)