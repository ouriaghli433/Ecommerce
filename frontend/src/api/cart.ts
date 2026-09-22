import { api } from './client'
import type { Cart, Single } from './types'

/** GET /cart — the customer's active cart (created on the first call). */
export async function getCart(): Promise<Cart> {
  const { data } = await api.get<Single<Cart>>('/cart')

  return data.data
}

/**
 * POST /cart/lines — adding the same product again ADDS the quantities.
 * The backend refuses an inactive product or more than the available stock.
 */
export async function addCartLine(productId: string, quantity: number): Promise<Cart> {
  const { data } = await api.post<Single<Cart>>('/cart/lines', {
    product_id: productId,
    quantity,
  })

  return data.data
}

/** PATCH /cart/lines/{id} — the quantity REPLACES the old one. */
export async function updateCartLine(lineId: string, quantity: number): Promise<Cart> {
  const { data } = await api.patch<Single<Cart>>(`/cart/lines/${lineId}`, { quantity })

  return data.data
}

export async function removeCartLine(lineId: string): Promise<Cart> {
  const { data } = await api.delete<Single<Cart>>(`/cart/lines/${lineId}`)

  return data.data
}

export async function clearCart(): Promise<Cart> {
  const { data } = await api.delete<Single<Cart>>('/cart')

  return data.data
}
