import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listCategories, listProducts } from '@/api/catalog'
import { getErrorMessage } from '@/api/client'
import { ProductCard } from '@/components/shop/ProductCard'
import { Button } from '@/components/ui/Button'
import { ErrorState, SkeletonGrid } from '@/components/ui/States'
import { formatMoney } from '@/lib/utils'

export function HomePage() {
  // The newest products: the API already returns them newest first.
  const productsQuery = useQuery({
    queryKey: ['products', { page: 1 }],
    queryFn: () => listProducts({ page: 1 }),
  })

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })

  const featured = productsQuery.data?.data.slice(0, 4) ?? []
  const highlight = productsQuery.data?.data[0]

  return (
    <div className="space-y-14">
      {/* Hero */}
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
              {highlight && (
                <Link to={`/products/${highlight.id}`}>
                  <Button size="lg" variant="ghost">
                    See {highlight.name}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* The highlighted product, taken from the API */}
          {highlight && (
            <Link
              to={`/products/${highlight.id}`}
              className="mx-auto w-full max-w-sm rounded-card bg-white p-6 shadow-card transition hover:-translate-y-1"
            >
              <div className="flex aspect-square items-center justify-center rounded-2xl bg-beige-soft">
                <span className="font-display text-5xl font-semibold text-navy/60">
                  {highlight.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted">
                  {highlight.category?.name ?? 'Featured'}
                </p>
                <p className="font-display text-xl font-semibold text-navy">{highlight.name}</p>
                <p className="font-display text-2xl font-semibold text-navy">
                  {formatMoney(highlight.price)}
                </p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Categories */}
      {categoriesQuery.data && categoriesQuery.data.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-navy">Browse by category</h2>
            <Link to="/products" className="text-sm text-muted hover:text-navy">
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categoriesQuery.data.slice(0, 4).map((category) => (
              <Link
                key={category.id}
                to={`/products?category_id=${category.id}`}
                className="rounded-card bg-white p-6 text-center shadow-soft transition hover:shadow-card"
              >
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-sage-soft" />
                <p className="font-medium text-navy">{category.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold text-navy">New arrivals</h2>
          <Link to="/products" className="text-sm text-muted hover:text-navy">
            See all
          </Link>
        </div>

        {productsQuery.isPending && <SkeletonGrid count={4} />}

        {productsQuery.isError && (
          <ErrorState
            message={getErrorMessage(productsQuery.error)}
            onRetry={() => productsQuery.refetch()}
          />
        )}

        {featured.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Promise band: presentation only, no backend data needed */}
      <section className="grid gap-4 rounded-card bg-beige-soft p-8 sm:grid-cols-3">
        {[
          { title: 'Real stock', text: 'What you see is what is in the warehouse.' },
          { title: 'Safe payment', text: 'Confirmed by our provider, never by the browser.' },
          { title: 'Follow your order', text: 'From payment to delivery, in your account.' },
        ].map((item) => (
          <div key={item.title} className="space-y-1">
            <p className="font-display text-lg font-semibold text-navy">{item.title}</p>
            <p className="text-sm text-muted">{item.text}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
