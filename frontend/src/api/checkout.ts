import { api } from './client'
import type { Order, Single } from './types'

export interface CheckoutPayload {
  address_id: string
  coupon_code?: string
}

/**
 * POST /checkout — turns the active cart into an order.
 *
 * The Idempotency-Key header is what makes a retry safe: if the answer is
 * lost and the same request is sent again with the SAME key, the backend
 * replays the first answer instead of creating a second order.
 *
 * One key belongs to one checkout attempt, so it is created once by the
 * checkout page and kept, not regenerated on every retry.
 */
export async function checkout(payload: CheckoutPayload, idempotencyKey: string): Promise<Order> {
  const { data } = await api.post<Single<Order>>('/checkout', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })

  return data.data
}

/** A random key, used once per checkout attempt. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}
