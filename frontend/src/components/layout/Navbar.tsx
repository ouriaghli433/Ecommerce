import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useCartCount } from '@/hooks/useCart'
import { cn } from '@/lib/utils'
import { CategoryNav, MobileCategoryMenu } from './CategoryMenu'

const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Verdant'

/**
 * Top navigation: the shop name, the main categories, and the links that
 * depend on who is logged in. What is shown is only for comfort; Laravel
 * checks every request anyway.
 */
export function Navbar() {
  const { isLoggedIn, isAdmin, user } = useAuth()
  const cartCount = useCartCount()
  const [menuOpen, setMenuOpen] = useState(false)

  // Shown after the categories, when they apply.
  const accountLinks = [
    { to: '/orders', label: 'Orders', show: isLoggedIn },
    { to: '/admin', label: 'Admin', show: isAdmin },
  ].filter((link) => link.show)

  return (
    <header className="sticky top-0 z-40 border-b border-beige/50 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        {/* The name is also the way back home */}
        <Link
          to="/"
          className="shrink-0 font-display text-xl font-semibold tracking-tight text-navy"
        >
          {APP_NAME}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {/* Electronics · Audio · Accessories · Home, each with its
              sub-categories */}
          <CategoryNav />

          {accountLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'rounded-pill px-3 py-2 text-sm font-medium transition lg:px-4',
                  isActive ? 'bg-sage-soft text-navy' : 'text-muted hover:text-navy',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link
                to="/notifications"
                aria-label="Notifications"
                className="hidden rounded-pill px-3 py-2 text-sm text-muted hover:text-navy lg:block"
              >
                Alerts
              </Link>
              <Link
                to="/profile"
                className="hidden rounded-pill px-3 py-2 text-sm font-medium text-navy hover:bg-navy-soft sm:block"
              >
                {user?.first_name ?? 'Account'}
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-pill px-3 py-2 text-sm font-medium text-navy hover:bg-navy-soft sm:block"
            >
              Log in
            </Link>
          )}

          <Link
            to="/cart"
            className="flex items-center gap-2 rounded-pill bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
          >
            Cart
            {cartCount > 0 && (
              <span className="rounded-pill bg-white px-2 text-xs font-semibold text-navy">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-pill px-3 py-2 text-navy md:hidden"
          >
            ☰
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="max-h-[70vh] overflow-y-auto border-t border-beige/50 bg-cream px-4 py-3 md:hidden">
          <MobileCategoryMenu onNavigate={() => setMenuOpen(false)} />

          <div className="mt-2 border-t border-beige/50 pt-2">
            {[
              { to: '/products', label: 'All products' },
              ...accountLinks,
              isLoggedIn
                ? { to: '/notifications', label: 'Notifications' }
                : { to: '/login', label: 'Log in' },
              ...(isLoggedIn ? [{ to: '/profile', label: 'My account' }] : []),
            ].map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block rounded-2xl px-4 py-3 text-sm font-medium',
                    isActive ? 'bg-sage-soft text-navy' : 'text-muted',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
