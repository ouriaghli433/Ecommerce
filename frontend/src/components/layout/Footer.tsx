const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Verdant'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-beige/50 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold text-navy">{APP_NAME}</p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Electronics, accessories and everyday things, delivered across Morocco.
          </p>
        </div>

        <div className="text-sm">
          <p className="font-medium text-navy">Shop</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>New arrivals</li>
            <li>Categories</li>
            <li>Delivery in 48h</li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="font-medium text-navy">Help</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>Payment is confirmed by our provider</li>
            <li>Prices include taxes</li>
            <li>Support: hello@example.com</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-beige/50 px-4 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {APP_NAME}. A learning project.
      </div>
    </footer>
  )
}
