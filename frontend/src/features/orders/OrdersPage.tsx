import { useState } from 'react';
import { ArrowRight, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState, MoneyDisplay, OrderStatusBadge } from '@/components/common';
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
import { formatDateTime } from '@/utils/format';
import { useOrders } from './useOrders';

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const ordersQuery = useOrders(page);
  const paginated = ordersQuery.data;
  const orders = paginated?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Order History</h2>
        <p className="text-sm text-slate-500">
          View all placed orders and check authoritative payment status.
        </p>
      </div>

      {ordersQuery.isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : ordersQuery.isError ? (
        <ErrorState
          title="Could not load orders"
          error={ordersQuery.error}
          onRetry={() => ordersQuery.refetch()}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="No orders yet"
          description="Once you place an order, you can track its payment and fulfillment status here."
          action={
            <Link to="/products">
              <Button variant="primary">Browse Products</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Order ID</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Destination</TableHeader>
                <TableHeader className="text-right">Total</TableHeader>
                <TableHeader className="text-right">Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs text-slate-600">
                    #{order.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDateTime(order.created_at)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.shipping_city}, {order.shipping_country}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    <MoneyDisplay amountInCentimes={order.total_amount} currency={order.currency} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/account/orders/${order.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        Details
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
