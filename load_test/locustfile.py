from locust import HttpUser, task, between
import random

class FlashSaleUser(HttpUser):
    wait_time = between(0, 0.1)

    @task
    def buy(self):
        user_id = f"u_{random.randint(1, 1000000)}"
        self.client.post("/cart/add", json={"sku": "iphone15", "user_id": user_id})