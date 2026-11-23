import { axiosInstance } from '@/services/http/axiosInstance';
import type {
  Order,
  PaginatedResponse,
  UpdateOrderStatusPayload,
  UpdateOrderStatusResponse,
  UUID,
} from '@/types';

export const orderApi = {
  async list(page = 1): Promise<PaginatedResponse<Order>> {
    const { data } = await axiosInstance.get<PaginatedResponse<Order>>('/orders', {
      params: { page },
    });
    return data;
  },

  async show(id: UUID): Promise<Order> {
    const { data } = await axiosInstance.get<Order>(`/orders/${id}`);
    return data;
  },

  async updateStatus(
    id: UUID,
    payload: UpdateOrderStatusPayload
  ): Promise<UpdateOrderStatusResponse> {
    const { data } = await axiosInstance.patch<UpdateOrderStatusResponse>(
      `/orders/${id}/status`,
      payload
    );
    return data;
  },
};
