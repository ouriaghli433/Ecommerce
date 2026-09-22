import { api } from './client'
import type { Refund, Single } from './types'

export async function listRefunds(paymentId: string): Promise<Refund[]> {
  const { data } = await api.get<{ data: Refund[] }>(`/payments/${paymentId}/refunds`)

  return data.data
}

/**
 * POST /payments/{id}/refunds — admin only.
 * "late_payment" is created by the backend itself and is refused here.
 */
export async function createRefund(
  paymentId: string,
  payload: { amount: number; reason: 'order_cancelled' | 'customer_request' | 'admin' },
  idempotencyKey: string,
): Promise<Refund> {
  const { data } = await api.post<Single<Refund>>(`/payments/${paymentId}/refunds`, payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })

  return data.data
}
