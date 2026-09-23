import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useCartCount } from '@/hooks/useCart'
import { useUnreadNotificationCount } from '@/hooks/useNotifications'
import { BagIcon, BellIcon, MenuIcon, UserIcon } from '@/components/ui/Icons'
import { cn } from '@/lib/utils'
import { CategoryNav, MobileCategoryMenu } from './CategoryMenu'
import { Logo } from './Logo'

/**
 * Top navigation: the shop mark, the main categories, and the icons for
 * notifications, the account and the cart. What is shown is only for
 * comfort; Laravel checks every request anyway.
 */
export function Navbar() {
  const { isLoggedIn, isAdmin, user } = useAuth()
  const cartCount = useCartCount()
  const unreadCount = useUnreadNotificationCount()
  const [menuOpen, setMenuOpen] = useState(false)

  const accountLinks = [
    { to: '/orders', label: 'Orders', show: isLoggedIn },
    { to: '/admin', label: 'Admin', show: isAdmin },
  ].filter((link) => link.show)

  return (
    <header className="sticky top-0 z-40 border-b border-beige/50 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" aria-label="Verdant, home" className="shrink-0">
          <Logo />
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

        <div className="flex shrink-0 items-center gap-1">
          {isLoggedIn ? (
            <>
              <Link
                to="/notifications"
                aria-label={
                  unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
                }
                className="relative hidden rounded-full p-2.5 text-navy transition hover:bg-navy-soft sm:block"
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.6rem] font-semibold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <Link
                to="/profile"
                aria-label="My account"
                title={user?.first_name}
                className="hidden rounded-full p-2.5 text-navy transition hover:bg-navy-soft sm:block"
              >
                <UserIcon />
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-pill px-3 py-2 text-sm font-medium text-navy transition hover:bg-navy-soft sm:block"
            >
              Log in
            </Link>
          )}

          <Link
            to="/cart"
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'}
            className="relative ml-1 flex items-center gap-2 rounded-pill bg-navy px-4 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light"
          >
            <BagIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="rounded-pill bg-white px-1.5 text-xs font-semibold text-navy">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-full p-2.5 text-navy transition hover:bg-navy-soft md:hidden"
          >
            <MenuIcon />
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
                ? {
                    to: '/notifications',
                    label: unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications',
                  }
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
