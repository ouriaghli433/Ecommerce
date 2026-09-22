import { api } from './client'
import type { Payment, Single, StartPaymentResponse } from './types'

/**
 * POST /orders/{id}/payments — asks the backend to start a payment.
 *
 * IMPORTANT: a successful answer only means the payment was CREATED. The
 * money is confirmed later by the provider's webhook, so the interface must
 * keep watching the payment status instead of celebrating right away.
 */
export async function startPayment(
  orderId: string,
  idempotencyKey: string,
): Promise<{ payment: Payment; checkoutUrl: string }> {
  const { data } = await api.post<StartPaymentResponse>(
    `/orders/${orderId}/payments`,
    {},
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )

  // The answer is { payment: { data: {...} }, checkout_url }
  const payment = 'data' in data.payment ? data.payment.data : data.payment

  return { payment, checkoutUrl: data.checkout_url }
}

export async function listOrderPayments(orderId: string): Promise<Payment[]> {
  const { data } = await api.get<{ data: Payment[] }>(`/orders/${orderId}/payments`)

  return data.data
}

export async function getPayment(id: string): Promise<Payment> {
  const { data } = await api.get<Single<Payment>>(`/payments/${id}`)

  return data.data
}
