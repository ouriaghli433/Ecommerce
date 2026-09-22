import { api } from './client'
import type { Order, OrderStatus, Paginated, Single } from './types'

export interface OrderFilters {
  status?: OrderStatus
  page?: number
}

/** GET /orders — a customer sees their own, an admin sees all of them. */
export async function listOrders(filters: OrderFilters = {}): Promise<Paginated<Order>> {
  const { data } = await api.get<Paginated<Order>>('/orders', { params: filters })

  return data
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await api.get<Single<Order>>(`/orders/${id}`)

  return data.data
}

/**
 * POST /orders/{id}/cancel — the backend decides who may cancel what:
 * a customer while the order is pending_payment or paid, an admin also
 * while it is processing. Anything else comes back as 403.
 */
export async function cancelOrder(id: string, reason?: string): Promise<Order> {
  const { data } = await api.post<Single<Order>>(`/orders/${id}/cancel`, { reason })

  return data.data
}

/** PATCH /orders/{id}/status — admin only: processing, shipped, delivered. */
export async function updateOrderStatus(
  id: string,
  status: 'processing' | 'shipped' | 'delivered',
): Promise<Order> {
  const { data } = await api.patch<Single<Order>>(`/orders/${id}/status`, { status })

  return data.data
}
