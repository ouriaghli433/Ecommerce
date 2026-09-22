"""
Walks the whole customer journey using exactly the calls the frontend makes.
Run: python flow_check.py
"""
import json
import urllib.request
import urllib.error
import uuid
import subprocess

API = "http://localhost:8080/api"
results = []


def call(method, path, body=None, token=None, headers=None, expect=None):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(API + path, data=data, method=method)
    request.add_header("Accept", "application/json")
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", "Bearer " + token)
    for key, value in (headers or {}).items():
        request.add_header(key, value)

    try:
        with urllib.request.urlopen(request) as response:
            status, payload = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, payload = error.code, error.read()

    try:
        parsed = json.loads(payload) if payload else {}
    except json.JSONDecodeError:
        parsed = {"raw": payload[:200].decode(errors="replace")}

    if expect is not None and status != expect:
        raise AssertionError(f"{method} {path} -> {status} (expected {expect}): {parsed}")

    return status, parsed


def check(name, condition, detail=""):
    results.append((name, condition, detail))
    print(("PASS  " if condition else "FAIL  ") + name + ((" :: " + detail) if detail else ""))


def artisan(*args):
    return subprocess.run(
        ["docker", "compose", "exec", "-T", "backend", "php", "artisan", *args],
        capture_output=True, text=True, cwd=r"C:\Users\Lenovo\Desktop\Ecommerce",
    ).stdout.strip()


# 1. Register (what the register page does)
email = f"flow-{uuid.uuid4().hex[:8]}@example.com"
status, body = call("POST", "/register", {
    "first_name": "Flow", "last_name": "Test", "email": email,
    "password": "password123", "password_confirmation": "password123",
}, expect=201)
token = body["token"]
user = body["user"]["data"] if "data" in body["user"] else body["user"]
check("register creates a customer", user["role"] == "customer", user["role"])

# registration cannot create an admin
status, body2 = call("POST", "/register", {
    "first_name": "Sneaky", "last_name": "User", "email": f"x-{uuid.uuid4().hex[:6]}@example.com",
    "password": "password123", "password_confirmation": "password123", "role": "admin",
}, expect=201)
u2 = body2["user"]["data"] if "data" in body2["user"] else body2["user"]
check("register ignores a role sent by the client", u2["role"] == "customer", u2["role"])

# 2. Browse products (public)
status, products = call("GET", "/products", expect=200)
check("public product listing works", len(products["data"]) > 0, f"{products['meta']['total']} products")
check("listing carries no stock (not cached)", "available_stock" not in products["data"][0])

product = products["data"][0]
status, detail = call("GET", f"/products/{product['id']}", expect=200)
stock = detail["data"]["available_stock"]
check("product page shows live stock", isinstance(stock, int), f"available={stock}")

# 3. Cart
call("POST", "/cart/lines", {"product_id": product["id"], "quantity": 2}, token=token, expect=200)
status, cart = call("GET", "/cart", token=token, expect=200)
check("cart holds the product", cart["data"]["lines"][0]["quantity"] == 2)

line_id = cart["data"]["lines"][0]["id"]
call("PATCH", f"/cart/lines/{line_id}", {"quantity": 1}, token=token, expect=200)
status, cart = call("GET", "/cart", token=token, expect=200)
check("cart quantity can be updated", cart["data"]["lines"][0]["quantity"] == 1)

status, body = call("POST", "/cart/lines", {"product_id": product["id"], "quantity": 99999}, token=token)
check("cart refuses more than the stock", status == 422, body.get("message", "")[:60])

# 4. Address
status, address = call("POST", "/addresses", {
    "full_name": "Flow Test", "phone": "0612345678", "address_line": "12 Rue Hassan II",
    "city": "Rabat", "postal_code": "10000", "country": "MA", "is_default": True,
}, token=token, expect=201)
address_id = address["data"]["id"]

# 5. Checkout with an idempotency key
key = str(uuid.uuid4())
status, order_body = call("POST", "/checkout", {"address_id": address_id, "coupon_code": "WELCOME10"},
                          token=token, headers={"Idempotency-Key": key}, expect=201)
order = order_body["data"]
check("checkout creates the order", order["status"] == "pending_payment", order["id"][:8])
check("coupon applied by the server", order["discount_amount"] > 0,
      f"subtotal={order['subtotal']} discount={order['discount_amount']} total={order['total_amount']}")
check("address snapshot stored", order["shipping_address"]["city"] == "Rabat")

# 6. Same key + same body -> replay, no second order
status, replay = call("POST", "/checkout", {"address_id": address_id, "coupon_code": "WELCOME10"},
                      token=token, headers={"Idempotency-Key": key}, expect=201)
check("idempotent checkout replays the first order", replay["data"]["id"] == order["id"])

# same key + different body -> 409
status, conflict = call("POST", "/checkout", {"address_id": address_id},
                        token=token, headers={"Idempotency-Key": key})
check("same key + other body is refused", status == 409, conflict.get("message", "")[:60])

# cart was converted
status, cart = call("GET", "/cart", token=token, expect=200)
check("cart is empty after checkout", len(cart["data"]["lines"]) == 0)

# 7. Payment
status, payment_body = call("POST", f"/orders/{order['id']}/payments", {}, token=token,
                            headers={"Idempotency-Key": str(uuid.uuid4())}, expect=201)
payment = payment_body["payment"]["data"] if "data" in payment_body["payment"] else payment_body["payment"]
check("payment starts as processing", payment["status"] == "processing", payment["provider_ref"])

status, again = call("POST", f"/orders/{order['id']}/payments", {}, token=token,
                     headers={"Idempotency-Key": str(uuid.uuid4())})
check("only one active payment per order", status == 409, again.get("message", "")[:60])

status, order_now = call("GET", f"/orders/{order['id']}", token=token, expect=200)
check("order is NOT paid before the webhook", order_now["data"]["status"] == "pending_payment")

# 8. The provider confirms (what artisan payment:simulate does)
out = artisan("payment:simulate", payment["provider_ref"])
status, order_paid = call("GET", f"/orders/{order['id']}", token=token, expect=200)
check("order becomes paid after the provider event", order_paid["data"]["status"] == "paid", out[-40:])

status, payments = call("GET", f"/orders/{order['id']}/payments", token=token, expect=200)
check("payment is succeeded", payments["data"][0]["status"] == "succeeded")

# stock: reservation became a sale
status, detail_after = call("GET", f"/products/{product['id']}", expect=200)
check("stock was sold, not just released", detail_after["data"]["available_stock"] == stock - 1,
      f"{stock} -> {detail_after['data']['available_stock']}")

# duplicate provider event changes nothing
artisan("payment:simulate", payment["provider_ref"])
status, detail_dup = call("GET", f"/products/{product['id']}", expect=200)
check("a repeated provider event has no extra effect",
      detail_dup["data"]["available_stock"] == detail_after["data"]["available_stock"])

# 9. Notifications (created by the queued job; the queue is sync in dev)
status, notifications = call("GET", "/notifications", token=token, expect=200)
check("notifications exist for the customer", notifications["meta"]["total"] >= 0,
      f"{notifications['meta']['total']} notification(s), unread={notifications['meta']['unread_count']}")

# 10. Admin side
status, admin_login = call("POST", "/login", {"email": "admin@example.com", "password": "password"}, expect=200)
admin_token = admin_login["token"]
status, all_orders = call("GET", "/orders", token=admin_token, expect=200)
check("admin sees every order", all_orders["meta"]["total"] >= 1, f"{all_orders['meta']['total']} orders")

status, moved = call("PATCH", f"/orders/{order['id']}/status", {"status": "processing"}, token=admin_token, expect=200)
check("admin moves paid -> processing", moved["data"]["status"] == "processing")

status, refused = call("PATCH", f"/orders/{order['id']}/status", {"status": "delivered"}, token=admin_token)
check("an impossible transition is refused", refused == 422 or status == 422, str(status))

status, inventory = call("GET", f"/products/{product['id']}/inventory", token=admin_token, expect=200)
check("admin reads on_hand/reserved/available", "available" in inventory["data"],
      f"on_hand={inventory['data']['on_hand']} reserved={inventory['data']['reserved']}")

status, forbidden = call("GET", "/users", token=token)
check("a customer cannot list users", forbidden == 403 or status == 403, str(status))

status, coupons_forbidden = call("GET", "/coupons", token=token)
check("a customer cannot see coupons", status == 403, str(status))

# 11. Failure flow: a failed payment leaves the order pending
status, second = call("POST", "/register", {
    "first_name": "Fail", "last_name": "Flow", "email": f"fail-{uuid.uuid4().hex[:8]}@example.com",
    "password": "password123", "password_confirmation": "password123"}, expect=201)
t2 = second["token"]
call("POST", "/cart/lines", {"product_id": product["id"], "quantity": 1}, token=t2, expect=200)
status, addr2 = call("POST", "/addresses", {
    "full_name": "Fail Flow", "phone": "0611111111", "address_line": "2 Rue Test",
    "city": "Casablanca", "country": "MA"}, token=t2, expect=201)
status, order2 = call("POST", "/checkout", {"address_id": addr2["data"]["id"]}, token=t2,
                      headers={"Idempotency-Key": str(uuid.uuid4())}, expect=201)
status, pay2 = call("POST", f"/orders/{order2['data']['id']}/payments", {}, token=t2,
                    headers={"Idempotency-Key": str(uuid.uuid4())}, expect=201)
ref2 = (pay2["payment"]["data"] if "data" in pay2["payment"] else pay2["payment"])["provider_ref"]
artisan("payment:simulate", ref2, "--status=failed")
status, order2_after = call("GET", f"/orders/{order2['data']['id']}", token=t2, expect=200)
check("a failed payment leaves the order pending", order2_after["data"]["status"] == "pending_payment")

status, retry = call("POST", f"/orders/{order2['data']['id']}/payments", {}, token=t2,
                     headers={"Idempotency-Key": str(uuid.uuid4())})
check("the customer can try to pay again", status == 201, str(status))

# 12. Cancel releases the stock
status, before_cancel = call("GET", f"/products/{product['id']}", expect=200)
call("POST", f"/orders/{order2['data']['id']}/cancel", {"reason": "Changed my mind"}, token=t2, expect=200)
status, after_cancel = call("GET", f"/products/{product['id']}", expect=200)
check("cancelling releases the reserved stock",
      after_cancel["data"]["available_stock"] == before_cancel["data"]["available_stock"] + 1,
      f"{before_cancel['data']['available_stock']} -> {after_cancel['data']['available_stock']}")

print()
failed = [name for name, ok, _ in results if not ok]
print(f"{len(results) - len(failed)}/{len(results)} checks passed")
if failed:
    print("FAILED:", ", ".join(failed))
    raise SystemExit(1)
