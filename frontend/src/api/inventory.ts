import { api } from './client'
import type { Inventory, InventoryMovement, Paginated, Single } from './types'

/** GET /products/{id}/inventory — admin only. */
export async function getInventory(productId: string): Promise<Inventory> {
  const { data } = await api.get<Single<Inventory>>(`/products/${productId}/inventory`)

  return data.data
}

export async function listMovements(
  productId: string,
  page = 1,
): Promise<Paginated<InventoryMovement>> {
  const { data } = await api.get<Paginated<InventoryMovement>>(
    `/products/${productId}/inventory/movements`,
    { params: { page } },
  )

  return data
}

/**
 * POST /products/{id}/inventory/movements — admin only.
 * Only these four types can be created by hand; reservation, release and
 * sale belong to checkout and payments. The quantity is signed: damage must
 * be negative, purchase and return positive.
 */
export async function createMovement(
  productId: string,
  payload: {
    type: 'purchase' | 'return' | 'damage' | 'adjustment'
    quantity: number
    reason?: string
  },
): Promise<{ movement: InventoryMovement; inventory: Inventory }> {
  const { data } = await api.post<{
    movement: { data: InventoryMovement }
    inventory: { data: Inventory }
  }>(`/products/${productId}/inventory/movements`, payload)

  return { movement: data.movement.data, inventory: data.inventory.data }
}
