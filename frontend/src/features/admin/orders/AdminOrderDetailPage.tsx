import { useState } from 'react';
import { ArrowLeft, CreditCard, RotateCcw, Truck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '@/app/providers/ToastProvider';
import {
  ErrorState,
  MoneyDisplay,
  OrderStatusBadge,
  PageHeader,
  PaymentStatusBadge,
  RefundStatusBadge,
} from '@/components/common';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Modal,
  Select,
  Skeleton,
} from '@/components/ui';
import { useOrder } from '@/features/orders/useOrders';
import { parseApiError } from '@/services/http/errorParser';
import type {
  AdminUpdatableOrderStatus,
  OrderStatus,
  Payment,
  Refund,
  RefundReason,
} from '@/types';
import { formatDateTime } from '@/utils/format';
import { useCreateRefund, useUpdateOrderStatus } from '../useAdminQueries';

const nextAllowedStatus: Partial<Record<OrderStatus, AdminUpdatableOrderStatus>> = {
  paid: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

export function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const orderQuery = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const createRefund = useCreateRefund();

  const [refundingPayment, setRefundingPayment] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState<RefundReason>('admin');
  const [refundError, setRefundError] = useState<string | null>(null);
  const [issuedRefunds, setIssuedRefunds] = useState<Record<string, Refund>>({});

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-72" />
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

  const nextStatus = nextAllowedStatus[order.status];

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;
    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        payload: { status: nextStatus },
      });
    } catch (error) {
      toast.error('Status update failed', parseApiError(error).message);
    }
  };

  const handleConfirmRefund = async () => {
    if (!refundingPayment) return;
    setRefundError(null);
    try {
      const res = await createRefund.mutateAsync({
        paymentId: refundingPayment.id,
        payload: { reason: refundReason },
      });
      setIssuedRefunds((prev) => ({ ...prev, [refundingPayment.id]: res.refund }));
      setRefundingPayment(null);
    } catch (error) {
      setRefundError(parseApiError(error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
      </div>

      <PageHeader
        title={`Order #${order.id.slice(0, 8)}`}
        description={`Placed ${formatDateTime(order.created_at)} · Customer: ${order.user?.first_name ?? ''} ${order.user?.last_name ?? ''} (${order.user?.email ?? ''})`}
        actions={
          <div className="flex items-center gap-3">
            <OrderStatusBadge status={order.status} />
            {nextStatus && (
              <Button
                variant="secondary"
                isLoading={updateStatus.isPending}
                leftIcon={<Truck className="h-4 w-4" />}
                onClick={handleAdvanceStatus}
              >
                Mark as {nextStatus}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Order Lines</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {(order.order_lines ?? []).map((line) => (
                <div key={line.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {line.product?.name ?? line.product_id}
                    </p>
                    <p className="text-xs text-slate-500">
                      SKU: {line.product?.sku ?? '—'} &middot; Qty {line.quantity} &times;{' '}
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                Payments &amp; Refunds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!order.payments || order.payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payments attached to this order.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {order.payments.map((payment) => {
                    const localRefund = issuedRefunds[payment.id];
                    const canRefund =
                      payment.status === 'succeeded' &&
                      payment.provider === 'stripe' &&
                      !localRefund;

                    return (
                      <div key={payment.id} className="space-y-2 py-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold capitalize">{payment.provider}</span>
                              <PaymentStatusBadge status={payment.status} />
                            </div>
                            <p className="font-mono text-xs text-slate-400">
                              Ref: {payment.provider_ref ?? '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <MoneyDisplay
                              amountInCentimes={payment.amount}
                              currency={payment.currency}
                              className="font-semibold text-slate-900"
                            />
                            {canRefund && (
                              <Button
                                size="sm"
                                variant="danger"
                                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                                onClick={() => {
                                  setRefundError(null);
                                  setRefundReason('admin');
                                  setRefundingPayment(payment);
                                }}
                              >
                                Issue Refund
                              </Button>
                            )}
                          </div>
                        </div>
                        {localRefund && (
                          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                            <span>
                              Refund #{localRefund.id.slice(0, 8)} ({localRefund.reason})
                            </span>
                            <RefundStatusBadge status={localRefund.status} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <Alert variant="info">
                Note: <code>GET /api/orders/{'{id}'}</code> does not eager-load existing refunds. If a refund was previously issued in an earlier session, attempting another refund will return a backend conflict/validation message safely.
              </Alert>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <MoneyDisplay amountInCentimes={order.subtotal} currency={order.currency} />
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>
                  -<MoneyDisplay amountInCentimes={order.discount_amount} currency={order.currency} />
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <MoneyDisplay amountInCentimes={order.shipping_amount} currency={order.currency} />
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                <span>Total</span>
                <MoneyDisplay amountInCentimes={order.total_amount} currency={order.currency} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
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

      <Modal
        isOpen={Boolean(refundingPayment)}
        onClose={() => setRefundingPayment(null)}
        title="Issue Stripe Refund"
        description="This submits a full refund for the selected payment via the backend Stripe Refunds integration."
      >
        <div className="space-y-4">
          {refundError && <Alert variant="error">{refundError}</Alert>}

          {refundingPayment && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
              <p className="text-slate-600">
                Amount:{' '}
                <strong className="text-slate-900">
                  <MoneyDisplay
                    amountInCentimes={refundingPayment.amount}
                    currency={refundingPayment.currency}
                  />
                </strong>
              </p>
            </div>
          )}

          <Select
            label="Refund reason"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value as RefundReason)}
            options={[
              { value: 'admin', label: 'Admin decision' },
              { value: 'customer_request', label: 'Customer request' },
              { value: 'order_cancelled', label: 'Order cancelled' },
              { value: 'late_payment', label: 'Late payment' },
            ]}
          />

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              onClick={() => setRefundingPayment(null)}
              disabled={createRefund.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={createRefund.isPending}
              onClick={handleConfirmRefund}
            >
              Confirm Refund
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
