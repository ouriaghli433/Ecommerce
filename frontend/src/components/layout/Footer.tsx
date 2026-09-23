import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { useCategoryTree } from '@/hooks/useCategories'

/**
 * The company details are invented: this is a learning project, not a real
 * shop. They are here so the pages look finished.
 */
export function Footer() {
  const { tree } = useCategoryTree()

  return (
    <footer className="mt-20 border-t border-beige/60 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            Phones, laptops, audio and home essentials. Chosen one by one, kept in real stock,
            delivered across Morocco in 48 hours.
          </p>
          <div className="flex gap-2 text-xs text-muted">
            <span className="rounded-pill bg-cream px-3 py-1">Visa</span>
            <span className="rounded-pill bg-cream px-3 py-1">Mastercard</span>
            <span className="rounded-pill bg-cream px-3 py-1">CMI</span>
          </div>
        </div>

        <div className="text-sm">
          <p className="font-medium text-navy">Shop</p>
          <ul className="mt-3 space-y-2 text-muted">
            {tree.map((parent) => (
              <li key={parent.id}>
                <Link to={`/products?category_id=${parent.id}`} className="hover:text-navy">
                  {parent.name}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/products" className="hover:text-navy">
                All products
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="font-medium text-navy">Your account</p>
          <ul className="mt-3 space-y-2 text-muted">
            <li>
              <Link to="/orders" className="hover:text-navy">
                Track an order
              </Link>
            </li>
            <li>
              <Link to="/addresses" className="hover:text-navy">
                Delivery addresses
              </Link>
            </li>
            <li>
              <Link to="/notifications" className="hover:text-navy">
                Notifications
              </Link>
            </li>
            <li>
              <Link to="/profile" className="hover:text-navy">
                My details
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="font-medium text-navy">Verdant Maroc SARL</p>
          <ul className="mt-3 space-y-2 text-muted">
            <li>112 Boulevard Zerktouni</li>
            <li>20250 Casablanca, Morocco</li>
            <li>
              <a href="tel:+212522000000" className="hover:text-navy">
                +212 522 00 00 00
              </a>
            </li>
            <li>
              <a href="mailto:hello@verdant.ma" className="hover:text-navy">
                hello@verdant.ma
              </a>
            </li>
            <li className="pt-2 text-xs">Mon–Sat, 9:00–18:00</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-beige/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Verdant Maroc SARL · ICE 002547891000064</p>
          <p>Prices in MAD, taxes included · A learning project, nothing is really sold.</p>
        </div>
      </div>
    </footer>
  )
}
