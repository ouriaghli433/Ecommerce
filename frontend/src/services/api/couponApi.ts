import { axiosInstance } from '@/services/http/axiosInstance';
import type {
  Coupon,
  CouponPayload,
  CouponResponse,
  CouponsResponse,
  UUID,
} from '@/types';

export const couponApi = {
  async list(): Promise<Coupon[]> {
    const { data } = await axiosInstance.get<CouponsResponse>('/coupons');
    return data.coupons;
  },

  async show(id: UUID): Promise<Coupon> {
    const { data } = await axiosInstance.get<CouponResponse>(`/coupons/${id}`);
    return data.coupon;
  },

  async create(payload: CouponPayload): Promise<CouponResponse> {
    const { data } = await axiosInstance.post<CouponResponse>('/coupons', payload);
    return data;
  },

  async update(id: UUID, payload: Partial<CouponPayload>): Promise<CouponResponse> {
    const { data } = await axiosInstance.put<CouponResponse>(`/coupons/${id}`, payload);
    return data;
  },

  async disable(id: UUID): Promise<{ message: string }> {
    const { data } = await axiosInstance.delete<{ message: string }>(`/coupons/${id}`);
    return data;
  },
};
