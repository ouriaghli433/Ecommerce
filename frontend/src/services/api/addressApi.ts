import { axiosInstance } from '@/services/http/axiosInstance';
import type {
  Address,
  AddressPayload,
  AddressResponse,
  AddressesResponse,
  UUID,
} from '@/types';

export const addressApi = {
  async list(): Promise<Address[]> {
    const { data } = await axiosInstance.get<AddressesResponse>('/addresses');
    return data.addresses;
  },

  async show(id: UUID): Promise<Address> {
    const { data } = await axiosInstance.get<AddressResponse>(`/addresses/${id}`);
    return data.address;
  },

  async create(payload: AddressPayload): Promise<AddressResponse> {
    const { data } = await axiosInstance.post<AddressResponse>('/addresses', payload);
    return data;
  },

  async update(id: UUID, payload: Partial<AddressPayload>): Promise<AddressResponse> {
    const { data } = await axiosInstance.put<AddressResponse>(`/addresses/${id}`, payload);
    return data;
  },

  async remove(id: UUID): Promise<{ message: string }> {
    const { data } = await axiosInstance.delete<{ message: string }>(`/addresses/${id}`);
    return data;
  },
};
