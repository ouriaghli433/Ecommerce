import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { StorefrontLayout } from '@/app/layouts/StorefrontLayout';
import { Button, EmptyState } from '@/components/ui';
import { AddressesPage } from '@/features/addresses/AddressesPage';
import { AdminCategoriesPage } from '@/features/admin/categories/AdminCategoriesPage';
import { AdminCouponsPage } from '@/features/admin/coupons/AdminCouponsPage';
import { AdminDashboardPage } from '@/features/admin/dashboard/AdminDashboardPage';
import { AdminInventoryPage } from '@/features/admin/inventory/AdminInventoryPage';
import { AdminOrderDetailPage } from '@/features/admin/orders/AdminOrderDetailPage';
import { AdminOrdersPage } from '@/features/admin/orders/AdminOrdersPage';
import { AdminProductsPage } from '@/features/admin/products/AdminProductsPage';
import { AdminShippingPricesPage } from '@/features/admin/shipping/AdminShippingPricesPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { CartPage } from '@/features/cart/CartPage';
import { CheckoutCancelPage } from '@/features/checkout/CheckoutCancelPage';
import { CheckoutPage } from '@/features/checkout/CheckoutPage';
import { CheckoutSuccessPage } from '@/features/checkout/CheckoutSuccessPage';
import { AccountLayout } from '@/features/orders/AccountLayout';
import { AccountProfilePage } from '@/features/orders/AccountProfilePage';
import { OrderDetailPage } from '@/features/orders/OrderDetailPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { HomePage } from '@/features/products/HomePage';
import { ProductDetailsPage } from '@/features/products/ProductDetailsPage';
import { ProductsPage } from '@/features/products/ProductsPage';
import { GuestOnlyRoute, ProtectedRoute } from './ProtectedRoute';

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <EmptyState
        title="404 — Page not found"
        description="The page you requested does not exist or may have moved."
        action={
          <Link to="/">
            <Button variant="primary">Return Home</Button>
          </Link>
        }
      />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Storefront & Public Routes */}
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
        <Route path="/cart" element={<CartPage />} />

        {/* Authenticated User Routes (Customer & Admin) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<AccountProfilePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
              <Route path="addresses" element={<AddressesPage />} />
            </Route>
          </Route>
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Route>

        {/* Customer-Only Checkout & Stripe Return Routes */}
        <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<GuestOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      {/* Admin Dashboard Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="inventory" element={<AdminInventoryPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="shipping-prices" element={<AdminShippingPricesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
