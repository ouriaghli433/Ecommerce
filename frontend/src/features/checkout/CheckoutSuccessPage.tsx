import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorState, MoneyDisplay, OrderStatusBadge } from '@/components/common';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { useOrder } from '@/features/orders/useOrders';
import { getLastCheckoutOrderId } from '@/features/payments/useStripeCheckout';
import { orderApi } from '@/services/api';
import { queryKeys } from '@/services/api/queryKeys';
import { clearOrderIdempotencyKey } from '@/services/http/idempotency';

const MAX_POLLS = 8;

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const sessionId = searchParams.get('session_id');

  const [resolvedOrderId, setResolvedOrderId] = useState<string | null>(() =>
    getLastCheckoutOrderId()
  );
  const [isLookingUpOrder, setIsLookingUpOrder] = useState(!getLastCheckoutOrderId());
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.cart.current });
  }, [queryClient]);

  // Fallback lookup by matching Stripe session_id against user's recent orders if sessionStorage was empty
  useEffect(() => {
    if (resolvedOrderId || !sessionId) {
      setIsLookingUpOrder(false);
      return;
    }

    let cancelled = false;
    setIsLookingUpOrder(true);

    (async () => {
      try {
        const list = await orderApi.list(1);
        for (const candidate of list.data.slice(0, 10)) {
          const detail = await orderApi.show(candidate.id);
          if (detail.payments?.some((p) => p.provider_ref === sessionId)) {
            if (!cancelled) {
              setResolvedOrderId(detail.id);
            }
            break;
          }
        }
      } catch {
        // Handled cleanly in fallback UI below
      } finally {
        if (!cancelled) {
          setIsLookingUpOrder(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedOrderId, sessionId]);

  const shouldPoll = Boolean(resolvedOrderId) && pollCount < MAX_POLLS;
  const orderQuery = useOrder(resolvedOrderId ?? undefined, shouldPoll ? 2500 : false);
  const order = orderQuery.data;

  useEffect(() => {
    if (!order) return;
    if (order.status === 'pending_payment' && pollCount < MAX_POLLS) {
      const timer = window.setTimeout(() => setPollCount((c) => c + 1), 2500);
      return () => window.clearTimeout(timer);
    }
    if (order.status === 'paid') {
      clearOrderIdempotencyKey(order.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all(1) });
    }
  }, [order, pollCount, queryClient]);

  if (isLookingUpOrder || (resolvedOrderId && orderQuery.isLoading)) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-14 sm:px-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (orderQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <ErrorState
          title="Could not verify order status"
          error={orderQuery.error}
          onRetry={() => orderQuery.refetch()}
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Returned from Stripe Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="info">
              The backend does not expose a session lookup endpoint (`GET /api/payments/session/{'{id}'}`).
              Check your order history to verify authoritative payment confirmation from the Stripe webhook.
            </Alert>
            <div className="flex flex-wrap gap-3">
              <Link to="/account/orders">
                <Button variant="primary">View My Orders</Button>
              </Link>
              <Link to="/products">
                <Button variant="outline">Continue Shopping</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConfirmedPaid = ['paid', 'processing', 'shipped', 'delivered'].includes(order.status);
  const isTerminalUnpaid = ['cancelled', 'expired'].includes(order.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {isConfirmedPaid ? (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              ) : isTerminalUnpaid ? (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <XCircle className="h-6 w-6" />
                </div>
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Clock className="h-6 w-6" />
                </div>
              )}
              <div>
                <CardTitle>
                  {isConfirmedPaid
                    ? 'Payment Confirmed'
                    : isTerminalUnpaid
                      ? 'Order Not Completed'
                      : 'Awaiting Payment Confirmation'}
                </CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Order #{order.id.slice(0, 8)}
                </p>
              </div>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-6">
          {!isConfirmedPaid && !isTerminalUnpaid && (
            <Alert variant="warning">
              You have returned from Stripe Checkout, but the backend has not yet marked this order as paid via the Stripe webhook.
              Status checks update automatically, or you can refresh manually.
            </Alert>
          )}

          {isTerminalUnpaid && (
            <Alert variant="error">
              This order is currently marked as <strong>{order.status}</strong>. If Stripe charged a late payment, an automatic refund is initiated by the webhook.
            </Alert>
          )}

          <div className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <MoneyDisplay amountInCentimes={order.subtotal} currency={order.currency} />
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>
                  -<MoneyDisplay amountInCentimes={order.discount_amount} currency={order.currency} />
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping ({order.shipping_city})</span>
              <MoneyDisplay amountInCentimes={order.shipping_amount} currency={order.currency} />
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2.5 text-base font-bold text-slate-900">
              <span>Total</span>
              <MoneyDisplay amountInCentimes={order.total_amount} currency={order.currency} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isConfirmedPaid && (
              <Button
                variant="outline"
                isLoading={orderQuery.isFetching}
                leftIcon={<RefreshCw className="h-4 w-4" />}
                onClick={() => orderQuery.refetch()}
              >
                Refresh Status
              </Button>
            )}
            <Link to={`/account/orders/${order.id}`}>
              <Button variant="primary">View Order Details</Button>
            </Link>
            <Link to="/products">
              <Button variant="ghost">Continue Shopping</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
