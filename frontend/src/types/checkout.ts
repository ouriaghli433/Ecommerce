import type { Address } from './address';
import type { Cart, CartLine } from './cart';
import type { UUID } from './common';
import type { Order, OrderLine } from './order';

export interface CheckoutPreviewPayload {
  address_id?: UUID | null;
  coupon_code?: string | null;
}

export interface CheckoutPreviewResponse {
  addresses: Address[];
  selected_address: Address | null;
  cart: Cart;
  cart_lines: CartLine[];
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
}

export interface PlaceOrderPayload {
  address_id?: UUID | null;
  coupon_code?: string | null;
}

export interface PlaceOrderResponse {
  message: string;
  order: Order & { order_lines: OrderLine[] };
}
