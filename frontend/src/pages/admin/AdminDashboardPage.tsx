import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listProducts } from '@/api/catalog'
import { listOrders } from '@/api/orders'
import { listUsers } from '@/api/users'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/States'
import { statusTone } from '@/lib/status'
import { formatDate, formatMoney, humanize, shortId } from '@/lib/utils'

/** One number, taken from the "total" of a paginated list. */
function StatCard({ label, value, to }: { label: string; value: string; to: string }) {
  return (
    <Link to={to}>
      <Card className="transition hover:shadow-card">
        <CardBody>
          <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-navy">{value}</p>
        </CardBody>
      </Card>
    </Link>
  )
}

export function AdminDashboardPage() {
  const ordersQuery = useQuery({ queryKey: ['admin-orders', {}], queryFn: () => listOrders({}) })
  const toPayQuery = useQuery({
    queryKey: ['admin-orders', { status: 'pending_payment' }],
    queryFn: () => listOrders({ status: 'pending_payment' }),
  })
  const paidQuery = useQuery({
    queryKey: ['admin-orders', { status: 'paid' }],
    queryFn: () => listOrders({ status: 'paid' }),
  })
  const productsQuery = useQuery({ queryKey: ['admin-products'], queryFn: () => listProducts({}) })
  const usersQuery = useQuery({ queryKey: ['admin-users', 1], queryFn: () => listUsers(1) })

  const loading =
    ordersQuery.isPending || productsQuery.isPending || usersQuery.isPending

  const recent = ordersQuery.data?.data.slice(0, 6) ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Dashboard</h1>
        <p className="text-sm text-muted">A quick look at the shop.</p>
      </div>

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
            value={String(ordersQuery.data?.meta.total ?? 0)}
            to="/admin/orders"
          />
          <StatCard
            label="Waiting for payment"
            value={String(toPayQuery.data?.meta.total ?? 0)}
            to="/admin/orders?status=pending_payment"
          />
          <StatCard
            label="Paid"
            value={String(paidQuery.data?.meta.total ?? 0)}
            to="/admin/orders?status=paid"
          />
          <StatCard
            label="Products"
            value={String(productsQuery.data?.meta.total ?? 0)}
            to="/admin/products"
          />
        </div>
      )}

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-navy">Latest orders</h2>
            <Link to="/admin/orders" className="text-sm text-muted hover:text-navy">
              See all
            </Link>
          </div>

          {recent.length === 0 && <p className="text-sm text-muted">No order yet.</p>}

          <div className="space-y-2">
            {recent.map((order) => (
              <Link
                key={order.id}
                to={`/admin/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm hover:bg-sage-soft/60"
              >
                <span className="font-medium text-navy">{shortId(order.id)}</span>
                <span className="text-muted">{formatDate(order.created_at)}</span>
                <Badge tone={statusTone(order.status)}>{humanize(order.status)}</Badge>
                <span className="font-medium">
                  {formatMoney(order.total_amount, order.currency)}
                </span>
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>

      <p className="text-xs text-muted">
        Users: {usersQuery.data?.meta.total ?? 0} account(s) ·{' '}
        <Link to="/admin/users" className="underline">
          manage
        </Link>
      </p>
    </div>
  )
}
