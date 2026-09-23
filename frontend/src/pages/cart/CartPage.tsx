import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '@/api/client'
import { useCart, useCartMutations } from '@/hooks/useCart'
import { ProductThumb } from '@/components/shop/ProductThumb'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { formatMoney } from '@/lib/utils'

export function CartPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const cartQuery = useCart()
  const { updateLine, removeLine, clear } = useCartMutations()

  const [confirmClear, setConfirmClear] = useState(false)

  async function changeQuantity(lineId: string, quantity: number) {
    if (quantity < 1) return

    try {
      await updateLine.mutateAsync({ lineId, quantity })
    } catch (error) {
      // For example: "Only 4 left in stock." The backend decides.
      toast.error(getErrorMessage(error))
    }
  }

  async function onRemove(lineId: string) {
    try {
      await removeLine.mutateAsync(lineId)
      toast.info('Item removed.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  async function onClear() {
    try {
      await clear.mutateAsync()
      setConfirmClear(false)
      toast.info('Your cart is empty.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  if (cartQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  if (cartQuery.isError) {
    return (
      <ErrorState message={getErrorMessage(cartQuery.error)} onRetry={() => cartQuery.refetch()} />
    )
  }

  const cart = cartQuery.data

  if (!cart || cart.lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        message="Browse the shop and add something you like."
        action={
          <Link to="/products">
            <Button variant="secondary" size="sm">
              Go to the shop
            </Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-navy">Your cart</h1>
        <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
          Empty the cart
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {cart.lines.map((line) => (
            <Card key={line.id}>
              <CardBody className="flex flex-wrap items-center gap-4">
                <div className="h-20 w-20 flex-none overflow-hidden rounded-2xl bg-sage-soft">
                  <ProductThumb
                    name={line.product?.name ?? '?'}
                    url={line.product?.primary_image_url}
                    textClassName="text-lg"
                  />
                </div>

                <div className="min-w-[140px] flex-1">
                  <Link
                    to={`/products/${line.product_id}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {line.product?.name ?? 'Product'}
                  </Link>
                  <p className="text-sm text-muted">{formatMoney(line.unit_price)} each</p>
                </div>

                <div className="flex items-center rounded-pill border border-beige">
                  <button
                    type="button"
                    aria-label="Less"
                    className="px-3 py-1.5 text-lg text-navy disabled:opacity-40"
                    onClick={() => changeQuantity(line.id, line.quantity - 1)}
                    disabled={line.quantity <= 1 || updateLine.isPending}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label="More"
                    className="px-3 py-1.5 text-lg text-navy disabled:opacity-40"
                    onClick={() => changeQuantity(line.id, line.quantity + 1)}
                    disabled={updateLine.isPending}
                  >
                    +
                  </button>
                </div>

                <p className="w-24 text-right font-display font-semibold text-navy">
                  {formatMoney(line.line_total)}
                </p>

                <button
                  type="button"
                  onClick={() => onRemove(line.id)}
                  className="text-sm text-muted underline hover:text-red-600"
                >
                  Remove
                </button>
              </CardBody>
            </Card>
          ))}
        </div>

        <Card className="h-fit">
          <CardBody className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-navy">Summary</h2>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Items</span>
              <span className="font-medium">{formatMoney(cart.subtotal)}</span>
            </div>

            <p className="text-xs text-muted">
              Delivery, taxes and any coupon are calculated by the shop at the next step.
            </p>

            <Button className="w-full" onClick={() => navigate('/checkout')}>
              Go to checkout
            </Button>

            <Link to="/products" className="block text-center text-sm text-muted hover:text-navy">
              Continue shopping
            </Link>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Empty your cart?"
        message="Every item will be removed. This cannot be undone."
        confirmLabel="Empty the cart"
        loading={clear.isPending}
        onConfirm={onClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
