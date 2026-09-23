/**
 * The shapes the Laravel API sends back.
 * They follow the Resource classes in backend/app/Http/Resources.
 * All money values are integers in centimes.
 */

/** Laravel wraps a single resource in { data: ... } */
export interface Single<T> {
  data: T
}

/** A paginated list: { data: [...], links: {...}, meta: {...} } */
export interface Paginated<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

export type Role = 'customer' | 'admin'

export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: Role
  email_verified_at: string | null
  created_at: string
}

export interface AuthResponse {
  user: { data: User } | User
  token: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  parent_id: string | null
  parent?: Category
  children?: Category[]
}

export interface ProductImage {
  id: string
  url: string
  alt_text: string | null
  display_order: number
  is_primary: boolean
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  sku: string
  price: number
  is_active: boolean
  attributes: Record<string, string> | null
  category_id: string
  category?: Category
  /** Only sent on the product page; the listing has no stock on purpose. */
  available_stock?: number
  /** Sent by the listing and the cart: one picture is enough there. */
  primary_image_url?: string | null
  /** Only on the product page: the whole gallery, in display order. */
  images?: ProductImage[]
}

export interface CartLine {
  id: string
  product_id: string
  product?: Product
  quantity: number
  unit_price: number
  line_total: number
}

export interface Cart {
  id: string
  status: 'active' | 'converted' | 'abandoned'
  lines: CartLine[]
  subtotal: number
  created_at: string
}

export interface Address {
  id: string
  full_name: string
  phone: string
  address_line: string
  city: string
  postal_code: string | null
  country: string
  is_default: boolean
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'expired'

export interface OrderLine {
  id: string
  product_id: string
  product_name?: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface Order {
  id: string
  user_id: string
  status: OrderStatus
  subtotal: number
  discount_amount: number
  shipping_amount: number
  tax_amount: number
  total_amount: number
  currency: string
  coupon_code?: string | null
  shipping_address: {
    full_name: string
    phone: string
    address_line: string
    city: string
    postal_code: string | null
    country: string
  }
  lines?: OrderLine[]
  expires_at: string
  paid_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string | null
}

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed'

export interface Payment {
  id: string
  order_id: string
  status: PaymentStatus
  amount: number
  currency: string
  provider: string
  provider_ref: string | null
  failure_reason: string | null
  succeeded_at: string | null
}

export interface StartPaymentResponse {
  payment: { data: Payment } | Payment
  checkout_url: string
}

export type RefundReason = 'late_payment' | 'order_cancelled' | 'customer_request' | 'admin'

export interface Refund {
  id: string
  payment_id: string
  amount: number
  status: 'pending' | 'succeeded' | 'failed'
  reason: RefundReason
  provider_ref: string | null
  created_by: string | null
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface Coupon {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_order_amount: number
  max_usage: number | null
  per_user_limit: number | null
  starts_at: string | null
  expires_at: string | null
  is_active: boolean
}

export interface Inventory {
  id: string
  product_id: string
  on_hand: number
  reserved: number
  available: number
  updated_at: string
}

export type MovementType =
  | 'purchase'
  | 'reservation'
  | 'release'
  | 'sale'
  | 'return'
  | 'damage'
  | 'adjustment'

export interface InventoryMovement {
  id: string
  product_id: string
  type: MovementType
  quantity: number
  reason: string | null
  reference_type: string | null
  reference_id: string | null
  created_by: string | null
  created_at: string
}
