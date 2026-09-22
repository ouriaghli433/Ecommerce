import { Link } from 'react-router-dom'
import type { Product } from '@/api/types'
import { Badge } from '@/components/ui/Badge'
import { formatMoney } from '@/lib/utils'

/**
 * The API has no product photos, so each product gets a calm coloured
 * surface with its initials. It keeps the grid tidy and honest.
 */
function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

const surfaces = ['bg-sage-soft', 'bg-beige-soft', 'bg-navy-soft', 'bg-sage-light/40']

export function ProductCard({ product }: { product: Product }) {
  const surface = surfaces[product.sku.length % surfaces.length]

  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex flex-col gap-3 rounded-card bg-white p-3 shadow-soft transition hover:shadow-card"
    >
      <div
        className={`flex aspect-square items-center justify-center rounded-2xl ${surface} transition group-hover:scale-[1.01]`}
      >
        <span className="font-display text-3xl font-semibold text-navy/70">
          {initials(product.name)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-1 pb-1">
        {product.category && (
          <span className="text-xs uppercase tracking-wide text-muted">
            {product.category.name}
          </span>
        )}

        <h3 className="line-clamp-2 font-medium leading-snug text-navy">{product.name}</h3>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="font-display text-lg font-semibold text-navy">
            {formatMoney(product.price)}
          </span>

          {!product.is_active && <Badge tone="danger">Inactive</Badge>}
        </div>
      </div>
    </Link>
  )
}
