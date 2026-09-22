import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Verdant'

const links = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Shop' },
  { to: '/orders', label: 'Orders' },
]

/**
 * Top navigation. On a phone the links collapse into a menu button.
 */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-beige/50 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight text-navy">
          {APP_NAME}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-pill px-4 py-2 text-sm font-medium transition',
                  isActive ? 'bg-sage-soft text-navy' : 'text-muted hover:text-navy',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/cart"
            className="rounded-pill bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
          >
            Cart
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
        <nav className="border-t border-beige/50 bg-cream px-4 py-3 md:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
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
        </nav>
      )}
    </header>
  )
}
