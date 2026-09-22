import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '@/api/client'
import { newIdempotencyKey } from '@/api/checkout'
import { cancelOrder, getOrder } from '@/api/orders'
import { listOrderPayments, startPayment } from '@/api/payments'
import type { Order, Payment } from '@/api/types'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Modal'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { statusTone } from '@/lib/status'
import { formatDate, formatMoney, humanize, shortId } from '@/lib/utils'

/** A customer may cancel while the order is pending or paid (the backend
 *  decides for real; this only hides a button that would be refused). */
function canCancel(order: Order, isAdmin: boolean): boolean {
  if (isAdmin) return ['pending_payment', 'paid', 'processing'].includes(order.status)

  return ['pending_payment', 'paid'].includes(order.status)
}

/** A payment is still "in flight" while the provider has not answered. */
function isActive(payment: Payment): boolean {
  return payment.status === 'pending' || payment.status === 'processing'
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()

  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [paying, setPaying] = useState(false)

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
  })

  const paymentsQuery = useQuery({
    queryKey: ['order-payments', orderId],
    queryFn: () => listOrderPayments(orderId),
    // While a payment is waiting for the provider, ask again every 4
    // seconds: the answer will come from the webhook, not from this page.
    refetchInterval: (query) => (query.state.data?.some(isActive) ? 4000 : false),
  })

  const order = orderQuery.data
  const payments = paymentsQuery.data ?? []
  const activePayment = payments.find(isActive)
  const succeededPayment = payments.find((payment) => payment.status === 'succeeded')

  async function onStartPayment() {
    setPaying(true)

    try {
      const { payment } = await startPayment(orderId, newIdempotencyKey())

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order-payments', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
      ])

      toast.info('Payment started. We are waiting for the provider to confirm it.')

      // In development the provider is a local fake one, so the reference is
      // shown below and can be confirmed with an artisan command.
      console.info('Payment reference:', payment.provider_ref)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setPaying(false)
    }
  }

  async function onCancel() {
    setCancelling(true)

    try {
      await cancelOrder(orderId)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order-payments', orderId] }),
      ])

      setConfirmCancel(false)
      toast.success('Order cancelled.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setCancelling(false)
    }
  }

  if (orderQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (orderQuery.isError || !order) {
    return (
      <ErrorState message={getErrorMessage(orderQuery.error)} onRetry={() => orderQuery.refetch()} />
    )
  }

  const waitingForPayment = order.status === 'pending_payment'

  return (
    <div className="space-y-6">
      <Link to="/orders" className="text-sm text-muted hover:text-navy">
        ← All orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy">
            Order {shortId(order.id)}
          </h1>
          <p className="text-sm text-muted">Placed {formatDate(order.created_at)}</p>
        </div>

        <Badge tone={statusTone(order.status)}>{humanize(order.status)}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Items */}
          <Card>
            <CardHeader title="Items" />
            <CardBody className="space-y-3">
              {order.lines?.map((line) => (
                <div key={line.id} className="flex justify-between gap-4 text-sm">
                  <span className="text-navy">
                    {line.quantity} × {line.product_name ?? 'Product'}
                  </span>
                  <span className="font-medium">{formatMoney(line.line_total, order.currency)}</span>
                </div>
              ))}
              <p className="pt-2 text-xs text-muted">
                Prices are the ones frozen when the order was placed.
              </p>
            </CardBody>
          </Card>

          {/* Delivery address, copied at checkout */}
          <Card>
            <CardHeader title="Delivery address" />
            <CardBody className="text-sm">
              <p className="font-medium text-navy">{order.shipping_address.full_name}</p>
              <p className="text-muted">{order.shipping_address.address_line}</p>
              <p className="text-muted">
                {order.shipping_address.city}
                {order.shipping_address.postal_code
                  ? ` ${order.shipping_address.postal_code}`
                  : ''}
                , {order.shipping_address.country}
              </p>
              <p className="text-muted">{order.shipping_address.phone}</p>
            </CardBody>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader title="Payment" />
            <CardBody className="space-y-4">
              {payments.length === 0 && (
                <p className="text-sm text-muted">No payment attempt yet.</p>
              )}

              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-navy">
                      {formatMoney(payment.amount, payment.currency)} · {payment.provider}
                    </p>
                    <p className="text-xs text-muted">
                      {payment.provider_ref ?? 'no reference yet'}
                      {payment.failure_reason ? ` · ${humanize(payment.failure_reason)}` : ''}
                    </p>
                  </div>
                  <Badge tone={statusTone(payment.status)}>{humanize(payment.status)}</Badge>
                </div>
              ))}

              {activePayment && (
                <div className="space-y-2 rounded-2xl bg-sage-soft/60 px-4 py-3 text-sm text-navy">
                  <p className="font-medium">Waiting for the provider…</p>
                  <p className="text-xs">
                    This page checks the status every few seconds. Your order becomes paid only
                    when the provider confirms the money, never from this browser.
                  </p>
                  {activePayment.provider_ref && (
                    <p className="text-xs">
                      Development: confirm it with{' '}
                      <code className="rounded bg-white px-1">
                        php artisan payment:simulate {activePayment.provider_ref}
                      </code>
                    </p>
                  )}
                </div>
              )}

              {waitingForPayment && !activePayment && (
                <Button onClick={onStartPayment} loading={paying}>
                  Pay {formatMoney(order.total_amount, order.currency)}
                </Button>
              )}

              {succeededPayment && (
                <p className="text-sm text-emerald-700">
                  Payment received on {formatDate(succeededPayment.succeeded_at)}.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <Card className="h-fit">
            <CardHeader title="Summary" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Items</span>
                <span>{formatMoney(order.subtotal, order.currency)}</span>
              </div>

              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                  <span>−{formatMoney(order.discount_amount, order.currency)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted">Delivery</span>
                <span>
                  {order.shipping_amount === 0
                    ? 'Free'
                    : formatMoney(order.shipping_amount, order.currency)}
                </span>
              </div>

              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Tax</span>
                  <span>{formatMoney(order.tax_amount, order.currency)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-beige/60 pt-3 font-display text-lg font-semibold">
                <span>Total</span>
                <span>{formatMoney(order.total_amount, order.currency)}</span>
              </div>

              {waitingForPayment && (
                <p className="pt-2 text-xs text-muted">
                  To pay before {formatDate(order.expires_at)}. After that the order expires and
                  the items go back on sale.
                </p>
              )}

              {order.cancelled_at && (
                <p className="pt-2 text-xs text-muted">
                  Cancelled on {formatDate(order.cancelled_at)}
                  {order.cancel_reason ? ` · ${order.cancel_reason}` : ''}
                </p>
              )}
            </CardBody>
          </Card>

          {canCancel(order, isAdmin) && (
            <Button variant="ghost" className="w-full" onClick={() => setConfirmCancel(true)}>
              Cancel this order
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        message={
          order.status === 'paid'
            ? 'The order will be cancelled and the money refunded to you.'
            : 'The order will be cancelled and the items will go back on sale.'
        }
        confirmLabel="Cancel the order"
        loading={cancelling}
        onConfirm={onCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  )
}
