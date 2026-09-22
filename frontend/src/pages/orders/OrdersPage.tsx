import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getErrorMessage } from '@/api/client'
import { listOrders } from '@/api/orders'
import type { OrderStatus } from '@/api/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { statusTone } from '@/lib/status'
import { cn, formatDate, formatMoney, humanize, shortId } from '@/lib/utils'

const statuses: Array<{ value: OrderStatus | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'pending_payment', label: 'To pay' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Preparing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
]

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const status = (searchParams.get('status') ?? '') as OrderStatus | ''
  const page = Number(searchParams.get('page') ?? 1)

  const ordersQuery = useQuery({
    queryKey: ['orders', { status, page }],
    queryFn: () => listOrders({ status: status || undefined, page }),
  })

  function setFilter(next: { status?: string; page?: number }) {
    const params = new URLSearchParams(searchParams)

    if (next.status !== undefined) {
      if (next.status) params.set('status', next.status)
      else params.delete('status')
      params.delete('page')
    }

    if (next.page !== undefined) {
      if (next.page > 1) params.set('page', String(next.page))
      else params.delete('page')
    }

    setSearchParams(params)
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold text-navy">Your orders</h1>

      <div className="flex flex-wrap gap-2">
        {statuses.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter({ status: item.value })}
            className={cn(
              'rounded-pill px-4 py-2 text-sm transition',
              status === item.value ? 'bg-navy text-white' : 'bg-white text-muted hover:text-navy',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {ordersQuery.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {ordersQuery.isError && (
        <ErrorState
          message={getErrorMessage(ordersQuery.error)}
          onRetry={() => ordersQuery.refetch()}
        />
      )}

      {ordersQuery.data && ordersQuery.data.data.length === 0 && (
        <EmptyState
          title="No order yet"
          message={
            status
              ? 'No order with this status.'
              : 'When you place an order it will appear here, with its status.'
          }
          action={
            <Link to="/products">
              <Button variant="secondary" size="sm">
                Go to the shop
              </Button>
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {ordersQuery.data?.data.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`} className="block">
            <Card className="transition hover:shadow-card">
              <CardBody className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-navy">Order {shortId(order.id)}</p>
                  <p className="text-sm text-muted">
                    {formatDate(order.created_at)} · {order.lines?.length ?? 0} item(s)
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <Badge tone={statusTone(order.status)}>{humanize(order.status)}</Badge>
                  <span className="font-display text-lg font-semibold text-navy">
                    {formatMoney(order.total_amount, order.currency)}
                  </span>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      {ordersQuery.data && (
        <Pagination
          currentPage={ordersQuery.data.meta.current_page}
          lastPage={ordersQuery.data.meta.last_page}
          onPageChange={(nextPage) => setFilter({ page: nextPage })}
        />
      )}
    </div>
  )
}
