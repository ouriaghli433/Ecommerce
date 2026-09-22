import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listAddresses } from '@/api/addresses'
import { checkout, newIdempotencyKey } from '@/api/checkout'
import { parseApiError } from '@/api/client'
import { CART_KEY, useCart } from '@/hooks/useCart'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { cn, formatMoney } from '@/lib/utils'

export function CheckoutPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const cartQuery = useCart()
  const addressesQuery = useQuery({ queryKey: ['addresses'], queryFn: listAddresses })

  const [addressId, setAddressId] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Pick the default address the first time the list arrives.
  const addresses = addressesQuery.data ?? []
  const selectedAddressId =
    addressId || addresses.find((address) => address.is_default)?.id || addresses[0]?.id || ''

  /**
   * One key per checkout ATTEMPT.
   *
   * The key depends on what we are about to send. So:
   * - pressing the button again after a network error reuses the same key,
   *   and the backend replays its first answer instead of creating a second
   *   order;
   * - changing the address or the coupon is a different attempt, so it gets
   *   a new key (the backend would refuse the old key with a 409, because
   *   the body no longer matches).
   */
  const idempotencyKey = useMemo(
    () => newIdempotencyKey(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedAddressId, couponCode.trim().toUpperCase()],
  )

  async function placeOrder() {
    if (!selectedAddressId) {
      setErrorMessage('Choose a delivery address first.')

      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const order = await checkout(
        {
          address_id: selectedAddressId,
          coupon_code: couponCode.trim() ? couponCode.trim() : undefined,
        },
        idempotencyKey,
      )

      // The cart is converted on the backend; ask for the new empty one.
      queryClient.invalidateQueries({ queryKey: CART_KEY })

      toast.success('Order placed. You can pay it now.')
      navigate(`/orders/${order.id}`, { replace: true })
    } catch (error) {
      const info = parseApiError(error)

      // A coupon problem comes back on the coupon_code field, a stock or
      // cart problem on "cart": both are shown as one clear sentence.
      setErrorMessage(info.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (cartQuery.isPending || addressesQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (cartQuery.isError) {
    return <ErrorState message="Your cart could not be loaded." onRetry={() => cartQuery.refetch()} />
  }

  const cart = cartQuery.data

  if (!cart || cart.lines.length === 0) {
    return (
      <EmptyState
        title="Nothing to check out"
        message="Your cart is empty, so there is no order to place."
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
      <h1 className="font-display text-3xl font-semibold text-navy">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* 1. Address */}
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-lg font-semibold text-navy">
                  Delivery address
                </h2>
                <Link to="/addresses" className="text-sm text-muted underline hover:text-navy">
                  Manage
                </Link>
              </div>

              {addresses.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">
                    You have no saved address yet. Add one to continue.
                  </p>
                  <Link to="/addresses">
                    <Button variant="secondary" size="sm">
                      Add an address
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={cn(
                        'flex cursor-pointer gap-3 rounded-2xl border p-4 transition',
                        selectedAddressId === address.id
                          ? 'border-sage bg-sage-soft/50'
                          : 'border-beige hover:border-sage',
                      )}
                    >
                      <input
                        type="radio"
                        name="address"
                        className="mt-1"
                        checked={selectedAddressId === address.id}
                        onChange={() => setAddressId(address.id)}
                      />
                      <span className="text-sm">
                        <span className="flex flex-wrap items-center gap-2 font-medium text-navy">
                          {address.full_name}
                          {address.is_default && <Badge tone="sage">Default</Badge>}
                        </span>
                        <span className="block text-muted">
                          {address.address_line}, {address.city}
                          {address.postal_code ? ` ${address.postal_code}` : ''},{' '}
                          {address.country}
                        </span>
                        <span className="block text-muted">{address.phone}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* 2. Coupon */}
          <Card>
            <CardBody className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-navy">Coupon</h2>
              <Input
                label="Coupon code (optional)"
                placeholder="WELCOME10"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                hint="The discount is calculated by the shop when the order is placed."
              />
            </CardBody>
          </Card>

          {/* 3. Items */}
          <Card>
            <CardBody className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-navy">Your items</h2>

              {cart.lines.map((line) => (
                <div key={line.id} className="flex justify-between gap-4 text-sm">
                  <span className="text-muted">
                    {line.quantity} × {line.product?.name ?? 'Product'}
                  </span>
                  <span className="font-medium">{formatMoney(line.line_total)}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Summary */}
        <Card className="h-fit">
          <CardBody className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-navy">Summary</h2>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Items</span>
              <span className="font-medium">{formatMoney(cart.subtotal)}</span>
            </div>

            <div className="flex justify-between text-sm text-muted">
              <span>Discount, delivery and taxes</span>
              <span>Calculated by the shop</span>
            </div>

            <p className="rounded-2xl bg-sage-soft/60 px-4 py-3 text-xs text-navy">
              The final amount is computed by the shop when the order is created, from today's
              prices and stock.
            </p>

            {errorMessage && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              loading={submitting}
              disabled={!selectedAddressId}
              onClick={placeOrder}
            >
              Place the order
            </Button>

            <Link to="/cart" className="block text-center text-sm text-muted hover:text-navy">
              Back to the cart
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
