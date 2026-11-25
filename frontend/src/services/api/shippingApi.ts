import { axiosInstance } from '@/services/http/axiosInstance';
import type {
  PaginatedResponse,
  ShippingCitiesResponse,
  ShippingCity,
  ShippingPrice,
  ShippingPriceMutationResponse,
  ShippingPricePayload,
  UUID,
} from '@/types';

export const shippingApi = {
  async listCities(): Promise<ShippingCity[]> {
    const { data } = await axiosInstance.get<ShippingCitiesResponse>('/shipping-cities');
    return data.cities;
  },

  async list(page = 1): Promise<PaginatedResponse<ShippingPrice>> {
    const { data } = await axiosInstance.get<PaginatedResponse<ShippingPrice>>(
      '/shipping-prices',
      { params: { page } }
    );
    return data;
  },

  async show(id: UUID): Promise<ShippingPrice> {
    const { data } = await axiosInstance.get<ShippingPrice>(`/shipping-prices/${id}`);
    return data;
  },

  async create(payload: ShippingPricePayload): Promise<ShippingPriceMutationResponse> {
    const { data } = await axiosInstance.post<ShippingPriceMutationResponse>(
      '/shipping-prices',
      payload
    );
    return data;
  },

  async update(
    id: UUID,
    payload: Partial<ShippingPricePayload>
  ): Promise<ShippingPriceMutationResponse> {
    const { data } = await axiosInstance.put<ShippingPriceMutationResponse>(
      `/shipping-prices/${id}`,
      payload
    );
    return data;
  },

  async disable(id: UUID): Promise<{ message: string }> {
    const { data } = await axiosInstance.delete<{ message: string }>(
      `/shipping-prices/${id}`
    );
    return data;
  },
};
