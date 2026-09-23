import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getErrorMessage } from '@/api/client'
import { getProduct } from '@/api/catalog'
import { useAuth } from '@/auth/useAuth'
import { useCartMutations } from '@/hooks/useCart'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { ProductThumb } from '@/components/shop/ProductThumb'
import { cn, formatMoney } from '@/lib/utils'

export function ProductDetailPage() {
  const { productId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { isLoggedIn } = useAuth()
  const { addLine } = useCartMutations()

  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)

  const productQuery = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
  })

  async function onAddToCart() {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: `/products/${productId}` } })

      return
    }

    try {
      await addLine.mutateAsync({ productId, quantity })
      toast.success('Added to your cart.')
    } catch (error) {
      // The backend is the authority on stock: it may refuse even when the
      // page showed the product as available a moment ago.
      toast.error(getErrorMessage(error))
    }
  }

  if (productQuery.isPending) {
    return (
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (productQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(productQuery.error)}
        onRetry={() => productQuery.refetch()}
      />
    )
  }

  const product = productQuery.data
  const stock = product.available_stock ?? 0
  const outOfStock = stock <= 0
  const gallery = product.images ?? []

  return (
    <div className="space-y-8">
      <Link to="/products" className="text-sm text-muted hover:text-navy">
        ← Back to the shop
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery: one big picture, the others below it */}
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-card bg-sage-soft">
            <ProductThumb
              name={product.name}
              url={gallery[selectedImage]?.url ?? product.primary_image_url}
              alt={gallery[selectedImage]?.alt_text}
              textClassName="text-6xl"
            />
          </div>

          {gallery.length > 1 && (
            <div className="flex gap-3">
              {gallery.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  aria-label={`Picture ${index + 1}`}
                  aria-current={index === selectedImage}
                  className={cn(
                    'h-20 w-20 overflow-hidden rounded-2xl border-2 transition',
                    index === selectedImage ? 'border-navy' : 'border-transparent opacity-70',
                  )}
                >
                  <ProductThumb
                    name={product.name}
                    url={image.url}
                    alt={image.alt_text}
                    textClassName="text-base"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            {product.category && (
              <span className="text-xs uppercase tracking-[0.2em] text-muted">
                {product.category.name}
              </span>
            )}
            <h1 className="font-display text-3xl font-semibold text-navy">{product.name}</h1>
            <p className="font-display text-3xl font-semibold text-navy">
              {formatMoney(product.price)}
            </p>
          </div>

          {product.description && <p className="text-sm text-muted">{product.description}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={outOfStock ? 'danger' : 'success'}>
              {outOfStock ? 'Out of stock' : `${stock} available`}
            </Badge>
            <Badge tone="beige">SKU {product.sku}</Badge>
          </div>

          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <Card>
              <CardBody className="space-y-2 text-sm">
                {Object.entries(product.attributes).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <span className="capitalize text-muted">{key}</span>
                    <span className="font-medium text-navy">{String(value)}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-pill border border-beige bg-white">
              <button
                type="button"
                aria-label="Less"
                className="px-4 py-2 text-lg text-navy disabled:opacity-40"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                type="button"
                aria-label="More"
                className="px-4 py-2 text-lg text-navy disabled:opacity-40"
                onClick={() => setQuantity((value) => Math.min(stock || 1, value + 1))}
                disabled={quantity >= stock}
              >
                +
              </button>
            </div>

            <Button
              size="lg"
              onClick={onAddToCart}
              loading={addLine.isPending}
              disabled={outOfStock || !product.is_active}
            >
              {outOfStock ? 'Out of stock' : 'Add to cart'}
            </Button>
          </div>

          <p className="text-xs text-muted">
            Stock is confirmed when your order is placed, not when you add the product.
          </p>
        </div>
      </div>
    </div>
  )
}
