import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { cn } from '@/lib/utils'

const sections = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/users', label: 'Users' },
]

/**
 * The admin area has its own frame: a dark sidebar, no shop navigation.
 * Same colours and shapes as the shop, different job.
 */
export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function onLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream lg:flex-row">
      {/* Mobile bar */}
      <div className="flex items-center justify-between border-b border-navy/10 bg-navy px-4 py-3 text-white lg:hidden">
        <Link to="/admin" className="font-display text-lg font-semibold">
          Admin
        </Link>
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Menu">
          ☰
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'w-full shrink-0 bg-navy px-4 py-6 text-white lg:block lg:w-64',
          menuOpen ? 'block' : 'hidden',
        )}
      >
        <Link
          to="/admin"
          className="hidden px-3 font-display text-xl font-semibold tracking-tight lg:block"
        >
          Admin
        </Link>

        <nav className="mt-6 space-y-1">
          {sections.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              end={section.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'block rounded-2xl px-3 py-2.5 text-sm transition',
                  isActive ? 'bg-sage text-navy' : 'text-white/70 hover:bg-white/10 hover:text-white',
                )
              }
            >
              {section.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 space-y-1 border-t border-white/15 pt-4 text-sm">
          <p className="px-3 text-white/60">{user?.email}</p>
          <Link
            to="/"
            className="block rounded-2xl px-3 py-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            Back to the shop
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="block w-full rounded-2xl px-3 py-2 text-left text-white/70 hover:bg-white/10 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
