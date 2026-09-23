import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { MenuIcon } from '@/components/ui/Icons'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'

/**
 * The admin frame: a navy sidebar with the sections, and the page on the
 * right. Same colours as the shop, but a working tool rather than a
 * storefront.
 */
interface AdminLink {
  to: string
  label: string
  /** "end" marks the dashboard, which must not stay active on sub-pages. */
  end?: boolean
}

const sections: Array<{ label: string; links: AdminLink[] }> = [
  {
    label: 'Overview',
    links: [{ to: '/admin', label: 'Dashboard', end: true }],
  },
  {
    label: 'Selling',
    links: [
      { to: '/admin/orders', label: 'Orders' },
      { to: '/admin/coupons', label: 'Coupons' },
    ],
  },
  {
    label: 'Catalogue',
    links: [
      { to: '/admin/products', label: 'Products' },
      { to: '/admin/categories', label: 'Categories' },
    ],
  },
  {
    label: 'People',
    links: [{ to: '/admin/users', label: 'Users' }],
  },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function onLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="flex min-h-screen flex-col bg-cream lg:flex-row">
      {/* Mobile bar */}
      <div className="flex items-center justify-between border-b border-navy/10 bg-navy px-4 py-3 lg:hidden">
        <Link to="/admin">
          <Logo tone="light" />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="rounded-full p-2 text-white/80 hover:bg-white/10"
        >
          <MenuIcon />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'w-full shrink-0 flex-col justify-between bg-navy px-4 py-6 lg:flex lg:w-64',
          menuOpen ? 'flex' : 'hidden',
        )}
      >
        <div>
          <Link to="/admin" className="hidden px-2 lg:block">
            <Logo tone="light" />
          </Link>

          <nav className="mt-8 space-y-6">
            {sections.map((section) => (
              <div key={section.label}>
                <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-white/40">
                  {section.label}
                </p>

                <div className="mt-2 space-y-1">
                  {section.links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'block rounded-2xl px-3 py-2.5 text-sm transition',
                          isActive
                            ? 'bg-sage font-medium text-navy'
                            : 'text-white/70 hover:bg-white/10 hover:text-white',
                        )
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Who is logged in */}
        <div className="mt-8 space-y-1 border-t border-white/15 pt-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage text-sm font-semibold text-navy">
              {initials || 'A'}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-white">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="block truncate text-xs text-white/50">{user?.email}</span>
            </span>
          </div>

          <Link
            to="/"
            className="block rounded-2xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Back to the shop
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
