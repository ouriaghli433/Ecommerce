import type { UUID } from './common';
import type { Product } from './product';

export type CartStatus = 'active' | 'converted' | 'abandoned';

export interface CartLine {
  id: UUID;
  cart_id: UUID;
  product_id: UUID;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Cart {
  id: UUID;
  user_id: UUID | null;
  status: CartStatus;
  guest_token: string | null;
  created_at: string;
  updated_at: string;
  cart_lines?: CartLine[];
}

export interface CartResponse {
  message?: string;
  cart: Cart;
  guest_token: string | null;
}

export interface AddToCartPayload {
  product_id: UUID;
  quantity: number;
}

export interface UpdateCartLinePayload {
  quantity: number;
}
