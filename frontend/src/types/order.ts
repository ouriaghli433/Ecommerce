import type { User } from './auth';
import type { UUID } from './common';
import type { Coupon } from './coupon';
import type { Payment } from './payment';
import type { Product } from './product';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'expired';

export type AdminUpdatableOrderStatus = 'processing' | 'shipped' | 'delivered';

export interface OrderLine {
  id: UUID;
  order_id: UUID;
  product_id: UUID;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Order {
  id: UUID;
  user_id: UUID;
  coupon_id: UUID | null;
  shipping_address_id: UUID | null;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  expires_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address_line: string;
  shipping_city: string;
  shipping_postal_code: string | null;
  shipping_country: string;
  created_at: string;
  updated_at: string;
  user?: User;
  order_lines?: OrderLine[];
  payments?: Payment[];
  coupon?: Coupon | null;
}

export interface UpdateOrderStatusPayload {
  status: AdminUpdatableOrderStatus;
}

export interface UpdateOrderStatusResponse {
  message: string;
  order: Order;
}
