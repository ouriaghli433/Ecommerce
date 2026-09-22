import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { RedirectIfLoggedIn, RequireAdmin, RequireAuth } from '@/auth/RouteGuards'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ShopLayout } from '@/components/layout/ShopLayout'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'
import { AdminCouponsPage } from '@/pages/admin/AdminCouponsPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminInventoryPage } from '@/pages/admin/AdminInventoryPage'
import { AdminOrderDetailPage } from '@/pages/admin/AdminOrderDetailPage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { ToastProvider } from '@/components/ui/Toast'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ProfilePage } from '@/pages/auth/ProfilePage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { AddressesPage } from '@/pages/account/AddressesPage'
import { NotificationsPage } from '@/pages/account/NotificationsPage'
import { CartPage } from '@/pages/cart/CartPage'
import { CheckoutPage } from '@/pages/checkout/CheckoutPage'
import { OrderDetailPage } from '@/pages/orders/OrderDetailPage'
import { OrdersPage } from '@/pages/orders/OrdersPage'
import { ProductDetailPage } from '@/pages/shop/ProductDetailPage'
import { ProductsPage } from '@/pages/shop/ProductsPage'

/**
 * React Query keeps the data coming from the API: it caches it, knows when
 * it is old, and avoids asking twice for the same thing.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data stays fresh for 30 seconds
      retry: 1, // one retry, then show the error
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route element={<ShopLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/:productId" element={<ProductDetailPage />} />

                {/* Already logged in? These two pages are useless. */}
                <Route element={<RedirectIfLoggedIn />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                </Route>

                {/* Needs a token. */}
                <Route element={<RequireAuth />}>
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:orderId" element={<OrderDetailPage />} />
                  <Route path="/addresses" element={<AddressesPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Admin area: its own layout, admins only. */}
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="products/:productId/inventory" element={<AdminInventoryPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                  <Route path="coupons" element={<AdminCouponsPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
