import { useState, type FormEvent } from 'react';
import {
  ChevronDown,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { MoneyDisplay } from '@/components/common';
import { Button, Drawer, Modal, Skeleton } from '@/components/ui';
import { useShippingCities } from '@/features/addresses/useAddresses';
import { useLogout } from '@/features/auth/useAuth';
import { useCart } from '@/features/cart/useCart';
import { useActiveCategories } from '@/features/categories/useCategories';
import { getUserRole, useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/utils/cn';

const APP_NAME = import.meta.env.VITE_APP_NAME || 'ATELIER';

export function Navbar() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const role = getUserRole(user);

  const openCartDrawer = useCartStore((s) => s.openDrawer);
  const { itemCount } = useCart();
  const { data: categories } = useActiveCategories();
  const citiesQuery = useShippingCities(deliveryModalOpen);
  const logout = useLogout();

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    navigate(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : '/products');
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    await logout.mutateAsync();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            to="/"
            className="flex items-center gap-2.5 text-base font-extrabold tracking-tight text-slate-900"
          >
            <span className="grid grid-cols-2 gap-0.5 rounded-lg bg-[#2454E8]/10 p-1.5" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2454E8]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#2454E8]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#2454E8]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#2454E8]/50" />
            </span>
            <span>{APP_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            <NavLink
              to="/products"
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'
                )
              }
            >
              Catalog
            </NavLink>
            <Link
              to="/products?sort=latest"
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              New Arrivals
            </Link>
            <button
              type="button"
              onClick={() => setDeliveryModalOpen(true)}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Delivery
            </button>
            {role === 'admin' && (
              <Link
                to="/admin"
                className="rounded-full bg-[#2454E8]/10 px-3.5 py-1.5 text-sm font-semibold text-[#2454E8] transition-colors hover:bg-[#2454E8]/15"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="hidden max-w-xs flex-1 items-center md:flex"
          role="search"
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search iPhone, MacBook, AirPods..."
              aria-label="Search products"
              className="h-9 w-full rounded-full border border-slate-200 bg-[#F4F5F7] pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2454E8] focus:bg-white focus:outline-none"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCartDrawer}
            aria-label="Open shopping cart"
            className="relative inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2454E8] px-1.5 text-xs font-semibold text-white tabular-nums">
              {itemCount}
            </span>
          </button>

          {token && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
              >
                <UserIcon className="h-4 w-4 text-slate-500" />
                <span className="hidden max-w-[110px] truncate sm:inline">
                  {user.first_name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {accountMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setAccountMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    <div className="py-1">
                      {role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#2454E8] hover:bg-[#2454E8]/10"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      )}
                      <Link
                        to="/account"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Account Profile
                      </Link>
                      <Link
                        to="/account/orders"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        My Orders
                      </Link>
                      {role === 'customer' && (
                        <Link
                          to="/account/addresses"
                          onClick={() => setAccountMenuOpen(false)}
                          className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Shipping Addresses
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link to="/login">
                <Button variant="ghost" size="sm" pill>
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="sm" pill>
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Cities Modal */}
      <Modal
        isOpen={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        title="Supported Delivery Cities"
        description="Live shipping zones and delivery rates stored in the database."
      >
        {citiesQuery.isLoading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : citiesQuery.isError ? (
          <p className="text-sm text-red-600">Unable to load shipping cities right now.</p>
        ) : (citiesQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No active shipping cities configured.</p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(citiesQuery.data ?? []).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#F4F5F7] px-3.5 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-slate-900">
                  <MapPin className="h-3.5 w-3.5 text-[#2454E8]" />
                  {item.city}
                </span>
                <MoneyDisplay
                  amountInCentimes={item.cost}
                  className="font-semibold text-slate-700"
                />
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        position="left"
        title={APP_NAME}
      >
        <div className="space-y-6">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="h-10 w-full rounded-full border border-slate-200 bg-[#F4F5F7] pr-3 pl-9 text-sm"
            />
          </form>

          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Navigation
            </p>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Home
            </Link>
            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Catalog
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setDeliveryModalOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              <Truck className="h-4 w-4 text-[#2454E8]" />
              Delivery Cities &amp; Rates
            </button>
            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Shopping Cart ({itemCount})
            </Link>
          </div>

          {categories.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Categories
              </p>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-slate-200 pt-4">
            {token && user ? (
              <div className="space-y-2">
                {role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl bg-[#2454E8]/10 px-3 py-2 text-sm font-semibold text-[#2454E8]"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
                >
                  Account
                </Link>
                <Button variant="outline" pill className="w-full" onClick={handleLogout}>
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" pill className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" pill className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </header>
  );
}
