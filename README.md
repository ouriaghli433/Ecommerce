# Verdant

An online shop built end to end: a Laravel 11 API (catalogue, cart, checkout,
payments, refunds, webhooks, stock) and a React storefront with its admin
area. Built as a learning project, so the code favours clear and explicit
steps over clever shortcuts.

The shop is called **Verdant Maroc**. Everything it sells, and every company
detail in the footer, is invented.

Stack: PHP 8.5, Laravel 11, PostgreSQL 15, Redis 7, Nginx, Docker Compose,
Sanctum tokens, Pint, PHPUnit.

All money values are **integers in centimes** (100 = 1.00 MAD).

---

## 1. Start the project

```bash
docker compose up -d --build

docker compose exec backend composer install
docker compose exec backend cp .env.example .env
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate
```

The API answers on **http://localhost:8080/api** and the shop on
**http://localhost:5173**.

| Service | What it is | Port |
|---|---|---|
| `frontend` | React + Vite dev server (hot reload) | 5173 |
| `backend` | PHP-FPM with the Laravel app | internal |
| `worker` | Runs the queued jobs (notifications, expiration) | internal |
| `scheduler` | Queues the expiration every minute | internal |
| `nginx` | Web server in front of PHP | 8080 |
| `database` | PostgreSQL 15 (`ecommerce`, `ecommerce_test`) | 5435 |
| `redis` | Cache | internal |

### Frontend commands

```bash
docker compose build frontend          # build the image
docker compose up -d frontend          # start the dev server on :5173
docker compose logs -f frontend        # watch it

docker compose exec frontend npm run lint       # code style
docker compose exec frontend npm run typecheck  # TypeScript
docker compose exec frontend npm run build      # production build
```

The browser calls the API directly on port 8080; `VITE_API_URL` in
`compose.yaml` (or `frontend/.env`) says where that is.

### Demo data and accounts

```bash
docker compose exec backend php artisan db:seed
# or, to start from an empty database:
docker compose exec backend php artisan migrate:fresh --seed
```

| Account | Password | Role |
|---|---|---|
| `admin@example.com` | `password` | admin |
| `manager@example.com` | `password` | admin |
| `customer@example.com` | `password` | customer |

What the seeders create (`backend/database/seeders/`):

| Seeder | Data |
|---|---|
| `UserSeeder` | 2 admins + 25 customers |
| `CategorySeeder` | 4 main categories, 8 sub-categories, 1 hidden |
| `ProductSeeder` | 35 products with real stock, 2 of them not on sale |
| `CouponSeeder` | 8 coupons: percent, fixed, with limits, expired, not started, off |
| `AddressSeeder` | a default address per customer, a second one for some |
| `OrderSeeder` | ~33 orders spread over the last 60 days, in every status |
| `CartSeeder` | a few carts left open |

**The orders are created through the real services** (`CheckoutService`,
`PaymentService`, `OrderService`), not inserted by hand. So the demo data
obeys the same rules as the shop: reserved stock matches the orders waiting
for payment, paid orders have sale movements, cancelled ones released their
stock, and the refunds are real. The mix is fixed, so you always get orders
to pay, a refused payment, cancellations, expired orders, and two late
payments with their automatic `late_payment` refund (RG30).

Notifications are written by a queued job, which the `worker` service runs
for you.

The Postgres container creates the test database on its first start, with
`infrastructure/docker/postgres/init/create-test-database.sql`.

### Background work

The `worker` and `scheduler` services start with the stack, so notifications
appear and unpaid orders expire on their own. To watch them:

```bash
docker compose logs -f worker
docker compose logs -f scheduler
```

---

## 2. Environment variables

| Variable | Meaning | Default |
|---|---|---|
| `DB_*` | PostgreSQL connection (host `database` inside Docker) | see `.env.example` |
| `CACHE_STORE` | `redis` in Docker; `array` in tests | `redis` |
| `REDIS_HOST` | Redis host, `redis` inside Docker | `redis` |
| `QUEUE_CONNECTION` | `database` keeps jobs in the `jobs` table | `database` |
| `SESSION_DRIVER` | `array`: this is a token API, no sessions | `array` |
| `PAYMENT_PROVIDER` | Which provider class to use | `fake` |
| `PAYMENT_WEBHOOK_SECRET` | Secret used to sign/check webhooks | `local-webhook-secret` |
| `SHOP_PAYMENT_WINDOW_MINUTES` | Time to pay an order (RG26) | `20` |
| `SHOP_EXPIRATION_GRACE_MINUTES` | Extra wait before expiring (RG29) | `2` |
| `SHOP_SHIPPING_AMOUNT` | Flat delivery price in centimes | `3000` |
| `SHOP_FREE_SHIPPING_FROM` | Free delivery above this amount | `50000` |
| `SHOP_TAX_PERCENT` | Tax on (subtotal − discount) | `0` |

Never commit a real `.env`.

---

## 3. Authentication

Sanctum tokens. Register or log in, then send the token on every call:

```
Authorization: Bearer <token>
```

```bash
curl -X POST http://localhost:8080/api/register -H "Accept: application/json" \
  -d "first_name=Sara&last_name=Alami&email=sara@example.com&password=password123&password_confirmation=password123"
```

Roles: `customer` (default) and `admin`. Registering can never create an
admin; an existing admin changes a role with `PATCH /api/users/{id}`.

---

## 4. Endpoints

### Public
| Method | Path | Notes |
|---|---|---|
| POST | `/api/register`, `/api/login` | returns a token |
| GET | `/api/categories`, `/api/categories/{id}` | active only (admins see all) |
| GET | `/api/products`, `/api/products/{id}` | filters `?category_id=` `?search=`, paginated |
| POST | `/api/webhooks/payments/{provider}` | provider only, signed |

### Customer (token)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/me`, POST `/api/logout` | |
| GET/POST/PATCH/DELETE | `/api/addresses` | own addresses, one default |
| GET | `/api/cart` · POST `/api/cart/lines` · PATCH/DELETE `/api/cart/lines/{id}` · DELETE `/api/cart` | |
| POST | `/api/checkout` | cart → order, reserves stock |
| GET | `/api/orders`, `/api/orders/{id}` | own orders |
| POST | `/api/orders/{id}/cancel` | rules in RG25 |
| GET/POST | `/api/orders/{id}/payments` | start a payment |
| GET | `/api/payments/{id}` | |
| GET | `/api/notifications` · PATCH `/api/notifications/{id}/read` · POST `/api/notifications/read-all` | |

### Admin (token, role admin)
| Method | Path | Notes |
|---|---|---|
| GET/PATCH | `/api/users`, `/api/users/{id}` | change a role |
| POST/PATCH/DELETE | `/api/categories`, `/api/products` | |
| GET | `/api/products/{id}/inventory` | on_hand, reserved, available |
| GET/POST | `/api/products/{id}/inventory/movements` | purchase, return, damage, adjustment |
| GET/POST/PATCH/DELETE | `/api/coupons` | |
| PATCH | `/api/orders/{id}/status` | processing → shipped → delivered |
| GET/POST | `/api/payments/{id}/refunds` | |

---

## 5. How the main flows work

### Checkout (`CheckoutService`)
One transaction: lock the cart and the inventory rows (always in product id
order, which avoids deadlocks) → check each product is active and in stock →
re-read today's prices → lock and check the coupon → compute subtotal,
discount, shipping, tax and total → create the order with a **copy** of the
delivery address → reserve the stock → mark the cart `converted`.

### Payment (`PaymentService`)
`POST /api/orders/{id}/payments` creates the payment row inside a transaction
(a partial unique index allows only one active payment per order), then calls
the provider **outside** the transaction, because a network call must not hold
database locks.

A payment becomes `succeeded` only through a verified webhook. The frontend
never decides it.

### Webhooks
`POST /api/webhooks/payments/fake`, with the header:

```
X-Signature: <hmac-sha256 of the raw body, key = PAYMENT_WEBHOOK_SECRET>
```

Events understood: `payment.succeeded`, `payment.failed`, `refund.succeeded`,
`refund.failed`. Every event is stored in `webhook_events`; `provider_event_id`
is unique, so a repeated delivery answers `already_received` and changes
nothing.

### Late payment
Money that arrives after the order expired or was cancelled: the payment is
stored as `succeeded`, the order keeps its terminal status, and a refund with
reason `late_payment` is created automatically.

### Expiration
`orders:expire` runs every minute, and queues one `ExpireOrderJob` per order
past its deadline plus the grace period. The job locks the order, checks its
status again, skips orders with a payment still `processing`, marks it
`expired`, releases the reserved stock, then closes the provider payment.

### Idempotency
`POST /api/checkout`, `/api/orders/{id}/payments` and
`/api/payments/{id}/refunds` accept a header:

```
Idempotency-Key: <a value the client invents once>
```

Same key + same body replays the first answer (header
`Idempotency-Replayed: true`). Same key + different body → `409`. A key still
running → `409`.

### Cache
Product and category listings are cached in Redis for 5 minutes. Each key
carries a version number, and any write to a product or category increases
that version, so all old entries stop being used at once. **Stock is never
cached**: `available_stock` is read live on the product page.

---

## 6. The fake payment provider

`PAYMENT_PROVIDER=fake` uses `app/Services/Payment/FakePaymentProvider.php`.
It invents references and writes to the log instead of calling a real company.
No credentials are needed.

To "pay" an order locally, play the provider yourself:

```bash
# 1. start a payment and copy the provider_ref from the answer
# 2. send the event
docker compose exec backend php artisan payment:simulate fake_pi_xxxxx
docker compose exec backend php artisan payment:simulate fake_pi_xxxxx --status=failed
```

Or send the real HTTP request, signature included:

```bash
BODY='{"id":"evt_1","type":"payment.succeeded","data":{"provider_ref":"fake_pi_xxxxx"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "local-webhook-secret" -r | cut -d' ' -f1)

curl -X POST http://localhost:8080/api/webhooks/payments/fake \
  -H "Content-Type: application/json" -H "X-Signature: $SIG" -d "$BODY"
```

Adding a real provider: write a class implementing
`App\Services\Payment\PaymentProvider`, add one line in `AppServiceProvider`,
and set `PAYMENT_PROVIDER`.

---

## 7. Tests and code style

```bash
docker compose exec backend php artisan test
docker compose exec backend php artisan test --filter=CheckoutTest
docker compose exec backend ./vendor/bin/pint        # fix formatting
docker compose exec backend ./vendor/bin/pint --test # check only (CI does this)
```

Tests run on PostgreSQL, in the separate `ecommerce_test` database, because
the app relies on Postgres behaviour (row locks, partial unique indexes,
`jsonb`). `tests/TestCase.php` stops the suite if it is ever pointed at
another database.

`tests/Feature/Concurrency` really commits its rows and opens a second
database connection, to prove the row locks work.

---

## 8. The frontend

React 18 + TypeScript + Vite + Tailwind, in `frontend/`.

```
src/
  api/         one file per domain, the only place that calls the API
  auth/        AuthProvider (token + /me) and the route guards
  components/
    ui/        Button, Input, Card, Modal, Table, Toast, states…
    layout/    ShopLayout (navbar + footer) and AdminLayout (sidebar)
    shop/      product card
  hooks/       useCart
  pages/       one folder per area: shop, cart, checkout, orders,
               account, auth, admin
  lib/         class names, money in centimes, dates, status colours
```

**Customer pages:** home, shop with search/category/pagination, product,
cart, checkout, orders, order detail with payment, addresses,
notifications, profile, login, register.

**Admin pages** (`/admin`): dashboard, orders and order detail with a status
timeline, refunds, products with their pictures, stock per product,
categories, coupons and users.

**Rules the interface follows**

- The backend decides. The frontend hides buttons the backend would refuse,
  but never replaces its checks: prices, stock, roles and payment status all
  come from the API.
- Money is handled in centimes everywhere and only formatted for display.
- Checkout and payments send an `Idempotency-Key`; a retry of the same
  attempt replays the first answer instead of ordering twice.
- After starting a payment the order page polls until the provider's webhook
  confirms it. A payment is never "succeeded" because the browser says so.

### Checking the whole flow

```bash
python scripts/flow-check.py
```

It walks register → browse → cart → address → checkout → payment →
provider event → order paid → stock sold, plus the failure paths
(failed payment, duplicate webhook, duplicate checkout, cancellation)
against the running API. It needs the containers up and the demo data.

---

## 9. Troubleshooting

**500 with "could not be opened in append mode: Permission denied"**
Nginx/PHP-FPM run as `www-data`, but `php artisan` in the container runs as
root and creates `storage/logs/laravel.log` owned by root. Fix it once:

```bash
docker compose exec backend chmod -R 777 storage bootstrap/cache
```

**`php artisan` is slow on Windows**
The project folder is read through the Windows filesystem. Keeping the
project inside WSL2 (`~/projects/...`) makes it much faster; `vendor/` is
already in a Docker volume to avoid the worst of it.

**Tests seem to wipe your data**
They must not: they use `ecommerce_test`. `tests/TestCase.php` stops the run
if the database is anything else.

---

## 10. Project layout

```
backend/app/
  Http/Controllers/<Domain>/   thin controllers, one folder per domain
  Http/Requests/<Domain>/      validation + authorization
  Http/Resources/<Domain>/     JSON shape
  Http/Middleware/             webhook signature, idempotency
  Policies/                    who is allowed to do what
  Models/                      Eloquent models (UUID keys)
  Services/<Domain>/           business rules (checkout, payment, refund...)
  Jobs/                        queued side effects
  Console/Commands/            orders:expire, idempotency:prune, payment:simulate
infrastructure/docker/         Dockerfile, nginx and postgres config
```

The business rules (RG1 to RG40) come from the Merise document of the project;
the code refers to them by number in comments.
