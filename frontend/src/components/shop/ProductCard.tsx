import { Link } from 'react-router-dom'
import type { Product } from '@/api/types'
import { Badge } from '@/components/ui/Badge'
import { formatMoney } from '@/lib/utils'
import { ProductThumb } from './ProductThumb'

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex flex-col gap-3 rounded-card bg-white p-3 shadow-soft transition hover:shadow-card"
    >
      <div className="aspect-square overflow-hidden rounded-2xl bg-sage-soft">
        <ProductThumb
          name={product.name}
          url={product.primary_image_url}
          className="h-full w-full transition duration-300 group-hover:scale-105"
        />
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
