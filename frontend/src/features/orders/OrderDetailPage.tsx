import { ArrowLeft, CreditCard, MapPin, Package } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  ErrorState,
  MoneyDisplay,
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/components/common';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { useStripeCheckout } from '@/features/payments/useStripeCheckout';
import { getUserRole, useAuthStore } from '@/store/authStore';
import { formatDateTime } from '@/utils/format';
import { useOrder } from './useOrders';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const role = getUserRole(user);

  const orderQuery = useOrder(id);
  const { startStripeSession, isRedirecting, errorMessage } = useStripeCheckout();

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (orderQuery.isError) {
    return (
      <ErrorState
        title="Could not load order"
        error={orderQuery.error}
        onRetry={() => orderQuery.refetch()}
      />
    );
  }

  const order = orderQuery.data;
  if (!order) return null;

  const isExpired = order.expires_at ? new Date(order.expires_at).getTime() <= Date.now() : false;
  const canPay =
    role === 'customer' && order.status === 'pending_payment' && !isExpired;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            to="/account/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              Order #{order.id.slice(0, 8)}
            </h2>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-slate-500">
            Placed on {formatDateTime(order.created_at)}
            {order.paid_at && ` · Paid on ${formatDateTime(order.paid_at)}`}
          </p>
        </div>

        {canPay && (
          <Button
            variant="secondary"
            isLoading={isRedirecting}
            leftIcon={<CreditCard className="h-4 w-4" />}
            onClick={() => startStripeSession(order.id)}
          >
            Pay Now with Stripe
          </Button>
        )}
      </div>

      {errorMessage && (
        <Alert variant="error" title="Unable to initiate payment">
          {errorMessage}
        </Alert>
      )}

      {order.status === 'pending_payment' && (
        <Alert variant={isExpired ? 'warning' : 'info'}>
          {isExpired
            ? 'This order reservation window has expired and is awaiting backend verification.'
            : `Reserved stock expires at ${formatDateTime(order.expires_at)}. Complete Stripe payment before expiration.`}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Order Items */}
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-500" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {(order.order_lines ?? []).map((line) => (
                <div key={line.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <Link
                      to={`/products/${line.product_id}`}
                      className="font-medium text-slate-900 hover:text-emerald-700"
                    >
                      {line.product?.name ?? `Product ${line.product_id.slice(0, 8)}`}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Qty {line.quantity} &times;{' '}
                      <MoneyDisplay amountInCentimes={line.unit_price} currency={order.currency} />
                    </p>
                  </div>
                  <MoneyDisplay
                    amountInCentimes={line.unit_price * line.quantity}
                    currency={order.currency}
                    className="font-semibold text-slate-900"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment Attempts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!order.payments || order.payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payment attempts recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {order.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize text-slate-900">
                            {payment.provider}
                          </span>
                          <PaymentStatusBadge status={payment.status} />
                        </div>
                        <p className="text-xs text-slate-500">
                          {payment.succeeded_at
                            ? `Succeeded ${formatDateTime(payment.succeeded_at)}`
                            : `Created ${formatDateTime(payment.created_at)}`}
                        </p>
                        {payment.failure_reason && (
                          <p className="text-xs text-red-600">{payment.failure_reason}</p>
                        )}
                      </div>
                      <MoneyDisplay
                        amountInCentimes={payment.amount}
                        currency={payment.currency}
                        className="font-semibold text-slate-900"
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400">
                Note: The backend does not include refund sub-records on order detail responses.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary & Shipping */}
        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <MoneyDisplay amountInCentimes={order.subtotal} currency={order.currency} />
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    Discount{order.coupon ? ` (${order.coupon.code})` : ''}
                  </span>
                  <span>
                    -<MoneyDisplay amountInCentimes={order.discount_amount} currency={order.currency} />
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <MoneyDisplay amountInCentimes={order.shipping_amount} currency={order.currency} />
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <MoneyDisplay amountInCentimes={order.tax_amount} currency={order.currency} />
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
                <span>Total</span>
                <MoneyDisplay amountInCentimes={order.total_amount} currency={order.currency} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" />
                Shipping Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{order.shipping_full_name}</p>
              <p>{order.shipping_address_line}</p>
              <p>
                {order.shipping_city}
                {order.shipping_postal_code ? `, ${order.shipping_postal_code}` : ''}
              </p>
              <p>{order.shipping_country}</p>
              <p className="pt-1 text-xs text-slate-500">Phone: {order.shipping_phone}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
