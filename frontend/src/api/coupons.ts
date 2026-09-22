import { api } from './client'
import type { Coupon, Paginated, Single } from './types'

export interface CouponPayload {
  code: string
  type: 'percent' | 'fixed'
  /** 1 to 100 for a percent coupon, centimes for a fixed one. */
  value: number
  min_order_amount?: number
  max_usage?: number | null
  per_user_limit?: number | null
  starts_at?: string | null
  expires_at?: string | null
  is_active?: boolean
}

export async function listCoupons(page = 1): Promise<Paginated<Coupon>> {
  const { data } = await api.get<Paginated<Coupon>>('/coupons', { params: { page } })

  return data
}

export async function createCoupon(payload: CouponPayload): Promise<Coupon> {
  const { data } = await api.post<Single<Coupon>>('/coupons', payload)

  return data.data
}

export async function updateCoupon(id: string, payload: Partial<CouponPayload>): Promise<Coupon> {
  const { data } = await api.patch<Single<Coupon>>(`/coupons/${id}`, payload)

  return data.data
}

export async function deleteCoupon(id: string): Promise<void> {
  await api.delete(`/coupons/${id}`)
}
