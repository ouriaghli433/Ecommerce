import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getErrorMessage } from '@/api/client'
import { listOrders } from '@/api/orders'
import type { OrderStatus } from '@/api/types'
import { AdminCard, AdminPageHeader } from '@/components/admin/AdminPage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
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

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const status = (searchParams.get('status') ?? '') as OrderStatus | ''
  const page = Number(searchParams.get('page') ?? 1)

  const ordersQuery = useQuery({
    queryKey: ['admin-orders', { status, page }],
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
      <AdminPageHeader
        title="Orders"
        description="Every order of the shop, newest first. Open one to move it along, cancel it or refund it."
      />

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

      {ordersQuery.isPending && <Skeleton className="h-64 w-full" />}

      {ordersQuery.isError && (
        <ErrorState
          message={getErrorMessage(ordersQuery.error)}
          onRetry={() => ordersQuery.refetch()}
        />
      )}

      {ordersQuery.data?.data.length === 0 && (
        <EmptyState title="No order" message="No order matches this filter." />
      )}

      {ordersQuery.data && ordersQuery.data.data.length > 0 && (
        <AdminCard bodyClassName="p-0">
          <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Date</Th>
                  <Th>Items</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {ordersQuery.data.data.map((order) => (
                  <tr key={order.id} className="transition hover:bg-cream">
                    <Td className="font-medium">{shortId(order.id)}</Td>
                    <Td className="text-muted">{formatDate(order.created_at)}</Td>
                    <Td className="text-muted">{order.lines?.length ?? 0}</Td>
                    <Td>{formatMoney(order.total_amount, order.currency)}</Td>
                    <Td>
                      <Badge tone={statusTone(order.status)}>{humanize(order.status)}</Badge>
                    </Td>
                    <Td className="text-right">
                      <Link to={`/admin/orders/${order.id}`}>
                        <Button size="sm" variant="ghost">
                          Open
                        </Button>
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
          </Table>
        </AdminCard>
      )}

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
