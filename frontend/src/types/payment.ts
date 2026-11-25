import type { UUID } from './common';

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'expired';

export interface Payment {
  id: UUID;
  order_id: UUID;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: string;
  provider_ref: string | null;
  failure_reason: string | null;
  succeeded_at: string | null;
  checkout_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RefundStatus = 'pending' | 'succeeded' | 'failed';
export type RefundReason = 'late_payment' | 'order_cancelled' | 'customer_request' | 'admin';

export interface Refund {
  id: UUID;
  payment_id: UUID;
  created_by: UUID | null;
  amount: number;
  status: RefundStatus;
  reason: RefundReason;
  provider_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCheckoutSessionPayload {
  order_id: UUID;
}

export interface CreateCheckoutSessionResponse {
  checkout_url: string;
  payment_id: UUID;
}

export interface CreateRefundPayload {
  reason: RefundReason;
}

export interface CreateRefundResponse {
  message: string;
  refund: Refund;
}
