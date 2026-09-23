import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listProducts } from '@/api/catalog'
import { listOrders } from '@/api/orders'
import { listUsers } from '@/api/users'
import type { OrderStatus } from '@/api/types'
import { AdminCard, AdminPageHeader, StatCard } from '@/components/admin/AdminPage'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { statusTone } from '@/lib/status'
import { formatDate, formatMoney, humanize, shortId } from '@/lib/utils'

/** Counts one status without loading every order: the API gives the total. */
function useOrderCount(status?: OrderStatus) {
  return useQuery({
    queryKey: ['admin-orders', { status: status ?? 'all' }],
    queryFn: () => listOrders(status ? { status } : {}),
  })
}

export function AdminDashboardPage() {
  const allOrders = useOrderCount()
  const toPay = useOrderCount('pending_payment')
  const paid = useOrderCount('paid')
  const processing = useOrderCount('processing')
  const shipped = useOrderCount('shipped')

  const products = useQuery({ queryKey: ['admin-products', 1], queryFn: () => listProducts({}) })
  const users = useQuery({ queryKey: ['admin-users', 1], queryFn: () => listUsers(1) })

  const loading = allOrders.isPending || products.isPending || users.isPending

  const recent = allOrders.data?.data.slice(0, 6) ?? []
  const waiting = paid.data?.data.slice(0, 4) ?? []

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="What the shop looks like right now. Every number comes from the API."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Orders"
            value={allOrders.data?.meta.total ?? 0}
            hint="All time"
            to="/admin/orders"
          />
          <StatCard
            label="Waiting for payment"
            value={toPay.data?.meta.total ?? 0}
            hint="Stock is reserved for these"
            tone="warning"
            to="/admin/orders?status=pending_payment"
          />
          <StatCard
            label="To prepare"
            value={paid.data?.meta.total ?? 0}
            hint="Paid, not yet packed"
            tone="sage"
            to="/admin/orders?status=paid"
          />
          <StatCard
            label="On the way"
            value={(processing.data?.meta.total ?? 0) + (shipped.data?.meta.total ?? 0)}
            hint="Preparing or shipped"
            to="/admin/orders?status=shipped"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <AdminCard
          title="Latest orders"
          bodyClassName="p-0"
          action={
            <Link to="/admin/orders" className="text-sm text-muted hover:text-navy">
              See all
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-muted">No order yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((order) => (
                  <tr key={order.id} className="transition hover:bg-cream">
                    <Td>
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="font-medium text-navy hover:underline"
                      >
                        {shortId(order.id)}
                      </Link>
                    </Td>
                    <Td className="text-muted">{formatDate(order.created_at)}</Td>
                    <Td>
                      <Badge tone={statusTone(order.status)}>{humanize(order.status)}</Badge>
                    </Td>
                    <Td className="text-right font-medium">
                      {formatMoney(order.total_amount, order.currency)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AdminCard>

        <div className="space-y-6">
          <AdminCard title="Needs packing">
            {waiting.length === 0 ? (
              <p className="text-sm text-muted">Nothing waiting. Everything is handled.</p>
            ) : (
              <ul className="space-y-3">
                {waiting.map((order) => (
                  <li key={order.id}>
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm transition hover:bg-sage-soft"
                    >
                      <span className="font-medium text-navy">{shortId(order.id)}</span>
                      <span className="text-muted">
                        {formatMoney(order.total_amount, order.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          <AdminCard title="Catalogue">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Products</dt>
                <dd className="font-medium text-navy">{products.data?.meta.total ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Customers & admins</dt>
                <dd className="font-medium text-navy">{users.data?.meta.total ?? 0}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/admin/products"
                className="rounded-pill bg-navy px-4 py-2 text-xs font-medium text-white hover:bg-navy-light"
              >
                Manage products
              </Link>
              <Link
                to="/admin/categories"
                className="rounded-pill bg-cream px-4 py-2 text-xs font-medium text-navy hover:bg-sage-soft"
              >
                Categories
              </Link>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  )
}
