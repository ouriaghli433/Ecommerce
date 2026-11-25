import { Link } from 'react-router-dom';
import { useActiveCategories } from '@/features/categories/useCategories';

const APP_NAME = import.meta.env.VITE_APP_NAME || 'ATELIER';

export function Footer() {
  const { data: categories } = useActiveCategories();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Link to="/" className="text-lg font-extrabold tracking-tight text-slate-900">
              {APP_NAME}
            </Link>
            <p className="text-sm leading-relaxed text-slate-500">
              Thoughtfully curated products backed by transparent stock reservations and secure Stripe checkout.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Catalog
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/products" className="hover:text-slate-900">
                  All Products
                </Link>
              </li>
              {categories.slice(0, 4).map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/products?category=${category.id}`}
                    className="hover:text-slate-900"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Customer Care
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/cart" className="hover:text-slate-900">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link to="/account/orders" className="hover:text-slate-900">
                  Order History
                </Link>
              </li>
              <li>
                <Link to="/account/addresses" className="hover:text-slate-900">
                  Shipping Addresses
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Account
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/login" className="hover:text-slate-900">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-slate-900">
                  Create account
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-slate-900">
                  My Profile
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p>Prices shown in MAD &middot; Powered by Stripe Checkout</p>
        </div>
      </div>
    </footer>
  );
}
