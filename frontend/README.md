# ATELIER — E-Commerce Frontend

Production-ready React + TypeScript storefront and admin dashboard integrated directly with the Laravel 11 REST API in `../backend`.

---

## Tech Stack

- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **React Router v7**
- **TanStack Query v5** (server state, caching, polling, invalidation)
- **Axios** (centralized HTTP client with Sanctum Bearer & `X-Guest-Token` interceptors)
- **Zustand** (persisted auth session & guest cart token)
- **React Hook Form** + **Zod** (client validation + Laravel `422` field error mapping)
- **Lucide React** + **Recharts**
- **Vitest** + **React Testing Library**

---

## Getting Started

### Prerequisites

- Node.js 20+ (tested on Node 24) and npm 10+
- Running Laravel 11 backend API (default Docker Nginx URL: `http://localhost:8080/api`)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Available variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL of the Laravel `/api` endpoints | `http://localhost:8080/api` |
| `VITE_APP_NAME` | Brand name rendered in header, auth, and footer | `ATELIER` |

> **Stripe Redirect Alignment:** The backend `backend/.env` configures `FRONTEND_URL=http://localhost:3000` for Stripe Checkout `success_url` (`/checkout/success?session_id={CHECKOUT_SESSION_ID}`) and `cancel_url` (`/checkout/cancel`). Vite is configured to run on port `3000` by default so Stripe redirects return cleanly during local development.

### 3. Run Development Server

```bash
npm run dev
```

App will be served at `http://localhost:3000`.

### 4. Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run typecheck` | Run strict TypeScript check (`tsc --noEmit`) |
| `npm run test` | Execute Vitest + React Testing Library test suite |
| `npm run build` | Type-check and generate production bundle in `dist/` |
| `npm run preview` | Preview the production build locally on port 3000 |

---

## Architecture

```text
src/
├── app/
│   ├── layouts/        # StorefrontLayout, AuthLayout, AdminLayout
│   ├── providers/      # QueryProvider, ToastProvider, AuthHydrator
│   └── router/         # AppRouter, ProtectedRoute, GuestOnlyRoute
├── components/
│   ├── common/         # MoneyDisplay (centimes -> MAD), StatusBadge, ErrorState, PageHeader
│   ├── navigation/     # Navbar, Footer
│   └── ui/             # Reusable design system primitives (Button, Input, Modal, Drawer, Table...)
├── features/
│   ├── auth/           # Login, Register, session & guest cart merge
│   ├── products/       # Home, Catalog listing/filter/sort, Product Details
│   ├── categories/     # Category queries & helpers
│   ├── cart/           # Guest & authenticated Cart Drawer & Cart Page
│   ├── addresses/      # Customer shipping address book CRUD
│   ├── checkout/       # Multi-step checkout, Stripe redirect, success polling & cancel view
│   ├── orders/         # Customer profile, order history & order detail
│   ├── payments/       # Idempotency-Key Stripe checkout session hook
│   └── admin/          # Overview, Products, Images, Categories, Inventory, Orders, Coupons, Shipping
├── services/
│   ├── http/           # axiosInstance, errorParser, idempotency helper
│   └── api/            # Feature-scoped API modules & TanStack Query keys
├── store/              # useAuthStore, useCartStore
├── types/              # TypeScript interfaces matching Laravel models
└── utils/              # Money (centimes <-> MAD), date formatting, product helpers
```

---

## Backend API Integration & Documented Constraints

The frontend adheres strictly to the actual Laravel backend endpoints and business rules:

- **Sanctum Bearer Auth:** Uses `Authorization: Bearer <token>` (not cookie-based SPA CSRF).
- **Monetary Units:** All backend money fields (`price`, `subtotal`, `discount_amount`, `shipping_amount`, `total_amount`, `cost`, fixed coupon values) are integer centimes (`100` = `1.00 MAD`).
- **Guest Cart (`X-Guest-Token`):** Unauthenticated cart actions persist the backend-issued UUID in `localStorage` and send `X-Guest-Token` on `/cart`, `/login`, and `/register` so Laravel merges guest items on authentication.
- **Stripe Idempotency & Verification:** `POST /api/payments/checkout` sends a per-order `Idempotency-Key` header. On `/checkout/success`, the frontend never assumes payment succeeded from the redirect URL alone; it polls `GET /api/orders/{order}` until the Stripe webhook updates the authoritative order status.
- **Catalog Filtering & Stock:** `GET /api/product` returns all active products unpaginated with `images` only (no backend search, filter, sort, pagination, or `inventory` payload). Search, category filtering, sorting, and pagination run client-side against the live catalog, while stock availability is enforced by `POST /api/cart` and `POST /api/checkout-place-order`.
- **Admin Products & Images:**
  - `POST /api/products/{product}/images` accepts JSON with `image_url` (no binary multipart upload).
  - `GET /api/product` filters out archived (`is_active: false`) products even for Bearer-authenticated admins, so the Admin Products page cross-references `GET /api/inventory` to surface archived items.
  - `InventoryService::recordMovement` rejects `quantity <= 0` for all movement types, so manual stock deductions use `type: "damage"`.
- **Dashboard Analytics:** No global revenue or customer count endpoints exist in the backend, so Admin Overview displays only real counts from `/api/orders`, `/api/inventory`, `/api/category`, and `/api/coupons`.

---

## Production Deployment (Docker + Nginx)

`frontend/Dockerfile` and `frontend/nginx.conf` provide a self-contained multi-stage production image with SPA routing fallback (`try_files $uri $uri/ /index.html`):

```bash
cd frontend
docker build \
  --build-arg VITE_API_BASE_URL=https://api.yourdomain.com/api \
  --build-arg VITE_APP_NAME=ATELIER \
  -t ecommerce-frontend:latest .

docker run -d -p 3000:80 --name ecommerce-frontend ecommerce-frontend:latest
```

When placing the frontend behind a unified reverse proxy alongside `ecommerce-nginx`, route `/api/*` to the Laravel Nginx container and `/*` to the frontend Nginx container, and update `FRONTEND_URL` in `backend/.env` to match the public frontend origin.
