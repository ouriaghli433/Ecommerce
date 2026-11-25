import { Badge, type BadgeVariant } from '@/components/ui';
import type { OrderStatus, PaymentStatus, RefundStatus } from '@/types';

const orderStatusMap: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  pending_payment: { label: 'Pending Payment', variant: 'warning' },
  paid: { label: 'Paid', variant: 'info' },
  processing: { label: 'Processing', variant: 'primary' },
  shipped: { label: 'Shipped', variant: 'info' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  expired: { label: 'Expired', variant: 'neutral' },
};

const paymentStatusMap: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  processing: { label: 'Processing', variant: 'info' },
  succeeded: { label: 'Succeeded', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  expired: { label: 'Expired', variant: 'neutral' },
};

const refundStatusMap: Record<RefundStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  succeeded: { label: 'Refunded', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = orderStatusMap[status] ?? { label: status, variant: 'neutral' as BadgeVariant };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = paymentStatusMap[status] ?? { label: status, variant: 'neutral' as BadgeVariant };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const cfg = refundStatusMap[status] ?? { label: status, variant: 'neutral' as BadgeVariant };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
