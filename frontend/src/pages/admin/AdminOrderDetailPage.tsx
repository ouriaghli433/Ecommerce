import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { newIdempotencyKey } from '@/api/checkout'
import { getErrorMessage, parseApiError } from '@/api/client'
import { cancelOrder, getOrder, updateOrderStatus } from '@/api/orders'
import { listOrderPayments } from '@/api/payments'
import { createRefund, listRefunds } from '@/api/refunds'
import type { Order, Payment } from '@/api/types'
import { AdminCard, AdminPageHeader } from '@/components/admin/AdminPage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { statusTone } from '@/lib/status'
import { cn, formatDate, formatMoney, humanize, shortId } from '@/lib/utils'

/** The moves an admin may make, following the backend transition table. */
function nextStatuses(order: Order): Array<'processing' | 'shipped' | 'delivered'> {
  switch (order.status) {
    case 'paid':
      return ['processing']
    case 'processing':
      return ['shipped']
    case 'shipped':
      return ['delivered']
    default:
      return []
  }
}

/** The normal journey of an order, used to draw the little timeline. */
const journey = [
  { status: 'pending_payment', label: 'Placed' },
  { status: 'paid', label: 'Paid' },
  { status: 'processing', label: 'Prepared' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'delivered', label: 'Delivered' },
] as const

function OrderTimeline({ order }: { order: Order }) {
  // Cancelled and expired leave the journey, so the line is not drawn.
  if (order.status === 'cancelled' || order.status === 'expired') {
    return (
      <p className="text-sm text-muted">
        This order is {humanize(order.status).toLowerCase()}
        {order.cancelled_at ? ` since ${formatDate(order.cancelled_at)}` : ''}
        {order.cancel_reason ? ` · ${order.cancel_reason}` : ''}.
      </p>
    )
  }

  const currentIndex = journey.findIndex((step) => step.status === order.status)

  return (
    <ol className="flex flex-wrap gap-y-3">
      {journey.map((step, index) => {
        const done = index <= currentIndex

        return (
          <li key={step.status} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                done ? 'bg-sage text-navy' : 'bg-cream text-muted',
              )}
            >
              {done ? '✓' : index + 1}
            </span>

            <span className={cn('text-xs', done ? 'font-medium text-navy' : 'text-muted')}>
              {step.label}
            </span>

            {index < journey.length - 1 && (
              <span
                className={cn('mx-1 hidden h-px flex-1 sm:block', done ? 'bg-sage' : 'bg-beige')}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function AdminOrderDetailPage() {
  const { orderId = '' } = useParams()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [confirmCancel, setConfirmCancel] = useState(false)
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null)
  const [refundForm, setRefundForm] = useState({ amount: '', reason: 'customer_request' })
  const [refundErrors, setRefundErrors] = useState<Record<string, string>>({})

  const orderQuery = useQuery({ queryKey: ['order', orderId], queryFn: () => getOrder(orderId) })

  const paymentsQuery = useQuery({
    queryKey: ['order-payments', orderId],
    queryFn: () => listOrderPayments(orderId),
  })

  const succeeded = paymentsQuery.data?.filter((payment) => payment.status === 'succeeded') ?? []

  const refundsQuery = useQuery({
    queryKey: ['refunds', succeeded[0]?.id],
    queryFn: () => listRefunds(succeeded[0].id),
    enabled: succeeded.length > 0,
  })

  const refreshAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
      queryClient.invalidateQueries({ queryKey: ['order-payments', orderId] }),
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['refunds'] }),
    ])

  const statusMutation = useMutation({
    mutationFn: (status: 'processing' | 'shipped' | 'delivered') =>
      updateOrderStatus(orderId, status),
    onSuccess: async (_data, status) => {
      await refreshAll()
      toast.success(`Order moved to ${humanize(status).toLowerCase()}.`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(orderId, 'Cancelled by an administrator'),
    onSuccess: async () => {
      await refreshAll()
      setConfirmCancel(false)
      toast.success('Order cancelled.')
    },
    onError: (error) => {
      setConfirmCancel(false)
      toast.error(getErrorMessage(error))
    },
  })

  const refundMutation = useMutation({
    mutationFn: (payload: { paymentId: string; amount: number; reason: string }) =>
      createRefund(
        payload.paymentId,
        {
          amount: payload.amount,
          reason: payload.reason as 'order_cancelled' | 'customer_request' | 'admin',
        },
        newIdempotencyKey(),
      ),
    onSuccess: async () => {
      await refreshAll()
      setRefundPayment(null)
      toast.success('Refund sent to the provider.')
    },
    onError: (error) => {
      const info = parseApiError(error)
      setRefundErrors(info.fieldErrors)

      if (Object.keys(info.fieldErrors).length === 0) toast.error(info.message)
    },
  })

  function onRefundSubmit(event: FormEvent) {
    event.preventDefault()
    setRefundErrors({})

    if (!refundPayment) return

    refundMutation.mutate({
      paymentId: refundPayment.id,
      amount: Math.round(Number(refundForm.amount) * 100),
      reason: refundForm.reason,
    })
  }

  if (orderQuery.isPending) return <Skeleton className="h-80 w-full" />

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <ErrorState message={getErrorMessage(orderQuery.error)} onRetry={() => orderQuery.refetch()} />
    )
  }

  const order = orderQuery.data
  const moves = nextStatuses(order)
  const canCancel = ['pending_payment', 'paid', 'processing'].includes(order.status)

  const refunded =
    refundsQuery.data
      ?.filter((refund) => refund.status !== 'failed')
      .reduce((total, refund) => total + refund.amount, 0) ?? 0
  const refundable = succeeded[0] ? succeeded[0].amount - refunded : 0

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin/orders"
        backLabel="All orders"
        title={`Order ${shortId(order.id)}`}
        description={`Placed ${formatDate(order.created_at)} · customer ${shortId(order.user_id)}`}
        action={<Badge tone={statusTone(order.status)}>{humanize(order.status)}</Badge>}
      />

      <AdminCard>
        <OrderTimeline order={order} />
      </AdminCard>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <AdminCard title="Items">
            <ul className="divide-y divide-beige/50 text-sm">
              {order.lines?.map((line) => (
                <li key={line.id} className="flex justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-navy">
                    <span className="font-medium">{line.quantity} ×</span>{' '}
                    {line.product_name ?? 'Product'}
                    <span className="block text-xs text-muted">
                      {formatMoney(line.unit_price, order.currency)} each, frozen at purchase
                    </span>
                  </span>
                  <span className="font-medium">
                    {formatMoney(line.line_total, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </AdminCard>

          <AdminCard title="Delivery address">
            <div className="text-sm text-muted">
              <p className="font-medium text-navy">{order.shipping_address.full_name}</p>
              <p>{order.shipping_address.address_line}</p>
              <p>
                {order.shipping_address.city}
                {order.shipping_address.postal_code
                  ? ` ${order.shipping_address.postal_code}`
                  : ''}
                , {order.shipping_address.country}
              </p>
              <p>{order.shipping_address.phone}</p>
              <p className="mt-2 text-xs">
                This is the copy made when the order was placed; editing the customer's address
                does not change it.
              </p>
            </div>
          </AdminCard>

          <AdminCard title="Payments & refunds">
            <div className="space-y-3">
              {paymentsQuery.data?.length === 0 && (
                <p className="text-sm text-muted">No payment attempt yet.</p>
              )}

              {paymentsQuery.data?.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-navy">
                      {formatMoney(payment.amount, payment.currency)} · {payment.provider}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {payment.provider_ref ?? 'no reference yet'}
                      {payment.failure_reason ? ` · ${humanize(payment.failure_reason)}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(payment.status)}>{humanize(payment.status)}</Badge>

                    {payment.status === 'succeeded' && refundable > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRefundPayment(payment)
                          setRefundForm({
                            amount: (refundable / 100).toFixed(2),
                            reason: 'customer_request',
                          })
                          setRefundErrors({})
                        }}
                      >
                        Refund
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {refundsQuery.data && refundsQuery.data.length > 0 && (
                <div className="space-y-2 border-t border-beige/60 pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Refunds</p>
                  {refundsQuery.data.map((refund) => (
                    <div key={refund.id} className="flex justify-between gap-3 text-sm">
                      <span className="text-muted">
                        {formatMoney(refund.amount)} · {humanize(refund.reason)}
                      </span>
                      <Badge tone={statusTone(refund.status)}>{humanize(refund.status)}</Badge>
                    </div>
                  ))}

                  {refundable === 0 && (
                    <p className="text-xs text-muted">Fully refunded.</p>
                  )}
                </div>
              )}
            </div>
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title="Summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Items</dt>
                <dd>{formatMoney(order.subtotal, order.currency)}</dd>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</dt>
                  <dd>−{formatMoney(order.discount_amount, order.currency)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd>
                  {order.shipping_amount === 0
                    ? 'Free'
                    : formatMoney(order.shipping_amount, order.currency)}
                </dd>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Tax</dt>
                  <dd>{formatMoney(order.tax_amount, order.currency)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-beige/60 pt-2 font-display text-lg font-semibold text-navy">
                <dt>Total</dt>
                <dd>{formatMoney(order.total_amount, order.currency)}</dd>
              </div>
            </dl>
          </AdminCard>

          <AdminCard title="Actions">
            <div className="space-y-3">
              {moves.map((status) => (
                <Button
                  key={status}
                  className="w-full"
                  loading={statusMutation.isPending}
                  onClick={() => statusMutation.mutate(status)}
                >
                  Mark as {humanize(status).toLowerCase()}
                </Button>
              ))}

              {canCancel && (
                <Button variant="ghost" className="w-full" onClick={() => setConfirmCancel(true)}>
                  Cancel the order
                </Button>
              )}

              {moves.length === 0 && !canCancel && (
                <p className="text-sm text-muted">
                  Nothing to do: this order is {humanize(order.status).toLowerCase()}.
                </p>
              )}

              {order.status === 'pending_payment' && (
                <p className="text-xs text-muted">
                  Waiting for the customer to pay. The order becomes paid only when the provider
                  confirms it, and expires on its own after {formatDate(order.expires_at)}.
                </p>
              )}
            </div>
          </AdminCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        message={
          succeeded.length > 0
            ? 'The order will be cancelled and the payment refunded automatically.'
            : 'The order will be cancelled and the reserved items will go back on sale.'
        }
        confirmLabel="Cancel the order"
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setConfirmCancel(false)}
      />

      <Modal
        open={refundPayment !== null}
        title="Refund this payment"
        onClose={() => setRefundPayment(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefundPayment(null)}>
              Cancel
            </Button>
            <Button form="refund-form" type="submit" loading={refundMutation.isPending}>
              Send the refund
            </Button>
          </>
        }
      >
        <form id="refund-form" onSubmit={onRefundSubmit} className="space-y-4" noValidate>
          <p className="text-sm text-muted">
            Up to {formatMoney(refundable)} can still be refunded on this payment.
          </p>

          <Input
            label="Amount (MAD)"
            type="number"
            step="0.01"
            min="0.01"
            value={refundForm.amount}
            onChange={(event) =>
              setRefundForm((current) => ({ ...current, amount: event.target.value }))
            }
            error={refundErrors.amount ?? refundErrors.payment}
            required
          />

          <Select
            label="Reason"
            value={refundForm.reason}
            onChange={(event) =>
              setRefundForm((current) => ({ ...current, reason: event.target.value }))
            }
            options={[
              { value: 'customer_request', label: 'Customer request' },
              { value: 'order_cancelled', label: 'Order cancelled' },
              { value: 'admin', label: 'Decision of the shop' },
            ]}
            error={refundErrors.reason}
          />
        </form>
      </Modal>
    </div>
  )
}
