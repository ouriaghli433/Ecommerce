# E-Commerce Platform & Backend API

A containerized e-commerce backend built with **Laravel 11**, **PostgreSQL 15**, **Redis**, **Nginx**, and **Stripe**, designed around reliable inventory tracking, idempotent payment workflows, and role-based access control.

---

## Key Features

- **Authentication & Role-Based Access Control (RBAC)**
  - Token-based authentication via **Laravel Sanctum**.
  - Dedicated middleware (`role:admin`, `role:customer`) separating administrative back-office operations from customer workflows.
- **Catalog & Media Management**
  - Hierarchical categories (parent/child relationships) and product management.
  - Multi-image support per product with primary image designation.
- **Shopping Cart (Guest & Authenticated)**
  - Supports both guest carts (`X-Guest-Token`) and authenticated user carts, with automatic cart line management and stock checks.
- **Inventory & Stock Ledger**
  - Tracks both `on_hand` and `reserved` stock quantities per product.
  - Atomic ledger movements (`purchase`, `return`, `damage`, `reservation`, `release`, `sale`, `adjustment`) protected with database row-level locks (`SELECT ... FOR UPDATE`).
- **Checkout, Coupons & City-Based Shipping**
  - Checkout preview and order placement with address resolution (default or specified customer address).
  - Dynamic city-based shipping rates and percentage/fixed discount coupons with usage limits and expiration dates.
- **Stripe Payments & Idempotency**
  - Stripe Checkout Session creation protected by a custom `Idempotency-Key` header and `IdempotencyService` to prevent duplicate payment sessions on network retries.
  - Verified **Stripe Webhook** processing (`checkout.session.completed`, `checkout.session.async_payment_failed`) with event deduplication (`WebhookEvent`) that finalizes orders and converts reserved stock into sales.
- **Refund Management**
  - Admin-initiated full refunds via the Stripe Refunds API with idempotency protection and status tracking (`late_payment`, `order_cancelled`, `customer_request`, `admin`).

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Framework** | Laravel 11 (PHP 8.2+ / PHP-FPM 8.5 in Docker) |
| **Authentication** | Laravel Sanctum |
| **Database** | PostgreSQL 15 (Alpine) |
| **Cache / Queue** | Redis 7 (Alpine) |
| **Web Server** | Nginx (Alpine) |
| **Payments** | Stripe PHP SDK (`stripe/stripe-php`) |
| **Containerization & CI** | Docker Compose, GitHub Actions, Trivy Security Scanner |

---

## Project Structure

```text
Ecommerce/
├── .github/workflows/
│   └── ci.yml                 # CI pipeline: Docker build, Trivy scan, migrations & PHPUnit tests
├── backend/                   # Laravel 11 API application
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/   # Domain-grouped controllers (Auth, Cart, Checkout, Order, Payment, Refund, etc.)
│   │   │   ├── Middleware/    # RoleMiddleware for admin/customer authorization
│   │   │   └── Requests/      # Form request validation classes
│   │   ├── Models/            # Eloquent models (UUID primary keys)
│   │   └── Services/          # Business logic (Checkout, Coupon, Idempotency, Inventory, Refund)
│   ├── database/
│   │   ├── factories/         # Model factories for testing and seeding
│   │   ├── migrations/        # Database schema migrations
│   │   └── seeders/           # DatabaseSeeder for sample data
│   ├── routes/
│   │   └── api.php            # REST API route definitions
│   └── tests/                 # Feature and Unit test suites
├── frontend/                  # Frontend build / assets directory
├── infrastructure/
│   └── docker/
│       ├── backend/Dockerfile # PHP-FPM image with PostgreSQL & Redis extensions
│       ├── nginx/default.conf # Nginx reverse proxy configuration
│       └── postgres/init/     # PostgreSQL initialization scripts
└── compose.yaml               # Multi-container Docker Compose definition
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Compose v2)
- *(Optional)* [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhook testing

### 1. Clone & Start Containers

```bash
git clone <repository-url>
cd Ecommerce
docker compose up -d --build
```

This starts four services:
- **`ecommerce-nginx`**: HTTP server exposed at `http://localhost:8080`
- **`ecommerce-backend`**: PHP-FPM application container
- **`ecommerce-database`**: PostgreSQL 15 exposed on host port `5435` (`localhost:5435`)
- **`ecommerce-redis`**: Redis 7 instance

### 2. Configure the Environment

Create the `.env` file inside the `backend` container (or copy `backend/.env.example` to `backend/.env`):

```bash
docker compose exec backend cp .env.example .env
```

Update `backend/.env` with your PostgreSQL and Stripe settings:

```env
DB_CONNECTION=pgsql
DB_HOST=database
DB_PORT=5432
DB_DATABASE=ecommerce
DB_USERNAME=ecommerce
DB_PASSWORD=ecommerce

FRONTEND_URL=http://localhost:3000

STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Install Dependencies, Generate Key & Run Migrations

```bash
docker compose exec backend composer install
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate --seed
```

---

## API Overview

All API routes are prefixed with `/api` (e.g., `http://localhost:8080/api/...`).

### Public Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/register` | Register a new customer account |
| `POST` | `/api/login` | Authenticate and receive a Sanctum bearer token |
| `GET` | `/api/category` | List all categories |
| `GET` | `/api/category/{category}` | Get details for a specific category |
| `GET` | `/api/product` | List products |
| `GET` | `/api/product/{product}` | Get details for a specific product |
| `GET` | `/api/cart` | View current cart (supports `Bearer` token or `X-Guest-Token`) |
| `POST` | `/api/cart` | Add an item to the cart |
| `PATCH` | `/api/cart/{cartLineId}` | Update cart line quantity |
| `DELETE` | `/api/cart/{cartLineId}` | Remove a line item from the cart |
| `POST` | `/api/stripe/webhook` | Stripe webhook receiver (`Stripe-Signature` verified) |

### Authenticated Endpoints (`auth:sanctum`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/me` | Get the authenticated user's profile |
| `POST` | `/api/logout` | Revoke the current access token |

### Customer Endpoints (`auth:sanctum`, `role:customer`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `API Resource` | `/api/addresses` | CRUD operations for customer shipping addresses |
| `POST` | `/api/checkout-preview` | Calculate subtotal, shipping cost, coupon discount, and total |
| `POST` | `/api/checkout-place-order` | Place an order and reserve product inventory |
| `POST` | `/api/payments/checkout` | Create a Stripe Checkout Session (requires `Idempotency-Key` header) |
| `GET` | `/api/orders` | List orders |
| `GET` | `/api/orders/{order}` | View order details |

### Admin Endpoints (`auth:sanctum`, `role:admin`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST / PUT / DELETE` | `/api/category/*` | Create, update, and delete categories |
| `POST / PUT / DELETE` | `/api/product/*` | Create, update, and delete products |
| `API Resource` | `/api/products/{product}/images` | Manage product images |
| `GET` | `/api/inventory` | List inventory stock levels (`on_hand`, `reserved`) |
| `GET` | `/api/inventory/{inventory}` | View specific inventory record |
| `GET / POST` | `/api/inventory-movement` | List and record stock ledger movements |
| `API Resource` | `/api/coupons` | Manage discount coupons |
| `API Resource` | `/api/shipping-prices` | Manage city-based shipping prices |
| `GET / PATCH` | `/api/orders/{order}/status` | View and update order statuses |
| `POST` | `/api/payments/{payment}/refund` | Issue a Stripe refund for a succeeded payment |

---

## Running Tests & CI

Run the test suite inside the backend container:

```bash
docker compose exec backend php artisan test
```

The GitHub Actions workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) automatically runs on pushes and pull requests to:
1. Build the `ecommerce-backend:dev` Docker image.
2. Scan the container image for `HIGH` and `CRITICAL` vulnerabilities using **Trivy**.
3. Boot the service stack with Docker Compose, run migrations, and execute the PHPUnit test suite.
