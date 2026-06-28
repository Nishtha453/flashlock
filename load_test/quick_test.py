import requests

BASE = "http://127.0.0.1:8000"
SKU = "iphone15"
STOCK = 5
ATTEMPTS = 10

requests.post(f"{BASE}/sale/start", json={"sku": SKU, "stock": STOCK})
print(f"Sale started: {SKU} with stock {STOCK}\n")

sold = 0
rejected = 0
for i in range(ATTEMPTS):
    resp = requests.post(f"{BASE}/cart/add", json={"sku": SKU, "user_id": f"u_{i}"})
    status = resp.json().get("status")
    print(f"Attempt {i+1}: {status}")
    if status == "sold":
        sold += 1
    elif status == "rejected":
        rejected += 1

print(f"\n--- RESULT ---")
print(f"Stock was: {STOCK}")
print(f"Sold: {sold}")
print(f"Rejected: {rejected}")
print(f"Oversold? {'YES - BUG!' if sold > STOCK else 'NO - lock works'}")

oversells = requests.get(f"{BASE}/oversells").json()
print(f"Oversell incidents logged: {len(oversells['oversells'])}")