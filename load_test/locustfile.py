from locust import HttpUser, task, between
import random

class FlashSaleUser(HttpUser):
    wait_time = between(0, 0.1)

    @task
    def buy(self):
        user_id = f"u_{random.randint(1, 1000000)}"
        with self.client.post(
            "/cart/add",
            json={"sku": "iphone15", "user_id": user_id},
            catch_response=True
        ) as response:
            if response.status_code == 503:
                # "Sold out" is expected behavior, not a failure
                response.success()
            elif response.status_code == 200:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")