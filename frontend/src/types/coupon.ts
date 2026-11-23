import type { UUID } from './common';

export type CouponType = 'percent' | 'fixed';

export interface Coupon {
  id: UUID;
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number;
  max_usage: number | null;
  per_user_limit: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponPayload {
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number;
  max_usage?: number | null;
  per_user_limit?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
}

export interface CouponsResponse {
  coupons: Coupon[];
}

export interface CouponResponse {
  coupon: Coupon;
  message?: string;
}
