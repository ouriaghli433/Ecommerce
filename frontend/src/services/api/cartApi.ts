import { axiosInstance } from '@/services/http/axiosInstance';
import type {
  AddToCartPayload,
  CartResponse,
  UpdateCartLinePayload,
  UUID,
} from '@/types';

export const cartApi = {
  async get(): Promise<CartResponse> {
    const { data } = await axiosInstance.get<CartResponse>('/cart');
    return data;
  },

  async addItem(payload: AddToCartPayload): Promise<CartResponse> {
    const { data } = await axiosInstance.post<CartResponse>('/cart', payload);
    return data;
  },

  async updateItem(cartLineId: UUID, payload: UpdateCartLinePayload): Promise<CartResponse> {
    const { data } = await axiosInstance.patch<CartResponse>(`/cart/${cartLineId}`, payload);
    return data;
  },

  async removeItem(cartLineId: UUID): Promise<CartResponse> {
    const { data } = await axiosInstance.delete<CartResponse>(`/cart/${cartLineId}`);
    return data;
  },
};
