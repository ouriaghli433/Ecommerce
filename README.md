# Ecommerce Backend API

A Laravel 11 REST API for an online shop: catalog, cart, checkout, payments,
refunds, webhooks and stock control. Built as a learning project, so the code
favours clear and explicit steps over clever shortcuts.

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

The Postgres container creates the test database on its first start, with
`infrastructure/docker/postgres/init/create-test-database.sql`.

### Background workers

Two processes are needed for the full behaviour. Run them in their own
terminals (or add them as services in `compose.yaml`):

```bash
# Runs the queued jobs: notifications, order expiration
docker compose exec backend php artisan queue:work

# Runs the scheduler: queues expiration every minute, prunes old keys daily
docker compose exec backend php artisan schedule:work
```

Without a worker, the API still works: the jobs simply wait in the `jobs`
table. Without the scheduler, unpaid orders are never expired.

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

## 8. Troubleshooting

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

## 9. Project layout

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
