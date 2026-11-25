import { useState } from 'react';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState, MoneyDisplay, OrderStatusBadge, PageHeader } from '@/components/common';
import {
  Button,
  EmptyState,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/components/ui';
import { useOrders } from '@/features/orders/useOrders';
import { formatDateTime } from '@/utils/format';

export function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const ordersQuery = useOrders(page);
  const paginated = ordersQuery.data;
  const orders = paginated?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders Management"
        description="Inspect customer orders, update fulfillment statuses, and issue Stripe refunds."
      />

      {ordersQuery.isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : ordersQuery.isError ? (
        <ErrorState
          title="Could not load orders"
          error={ordersQuery.error}
          onRetry={() => ordersQuery.refetch()}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title="No orders found"
          description="Customer orders will appear here once placed."
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Order ID</TableHeader>
                <TableHeader>Customer</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>City</TableHeader>
                <TableHeader className="text-right">Total</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader className="text-right">Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs text-slate-600">
                    #{order.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-900">
                      {order.user
                        ? `${order.user.first_name} ${order.user.last_name}`
                        : order.shipping_full_name}
                    </p>
                    {order.user?.email && (
                      <p className="text-xs text-slate-500">{order.user.email}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>{order.shipping_city}</TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    <MoneyDisplay amountInCentimes={order.total_amount} currency={order.currency} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDateTime(order.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/admin/orders/${order.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        Manage
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {paginated && (
            <Pagination
              currentPage={paginated.current_page}
              lastPage={paginated.last_page}
              total={paginated.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
