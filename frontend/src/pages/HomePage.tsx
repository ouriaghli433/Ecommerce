import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function HomePage() {
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-card bg-sage-soft">
        <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-2">
          <div className="space-y-5">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted">
              New season
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-navy sm:text-5xl">
              Things you will actually keep
            </h1>
            <p className="max-w-md text-muted">
              A small catalogue, chosen with care. Real stock, honest prices, and an order you can
              follow from payment to delivery.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/products">
                <Button size="lg">Browse the shop</Button>
              </Link>
            </div>
          </div>

          <div className="relative hidden aspect-square items-center justify-center rounded-card bg-white/70 lg:flex">
            <div className="h-40 w-40 rounded-full bg-sage" />
          </div>
        </div>
      </section>
    </div>
  )
}
