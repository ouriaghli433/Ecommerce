import { axiosInstance } from '@/services/http/axiosInstance';
import type {
  CategoriesResponse,
  Category,
  CategoryPayload,
  CategoryResponse,
  UUID,
} from '@/types';

export const categoryApi = {
  async list(): Promise<Category[]> {
    const { data } = await axiosInstance.get<CategoriesResponse>('/category');
    return data.categories;
  },

  async show(id: UUID): Promise<Category> {
    const { data } = await axiosInstance.get<CategoryResponse>(`/category/${id}`);
    return data.category;
  },

  async create(payload: CategoryPayload): Promise<Category> {
    const { data } = await axiosInstance.post<CategoryResponse>('/category', payload);
    return data.category;
  },

  async update(id: UUID, payload: Partial<CategoryPayload>): Promise<Category> {
    const { data } = await axiosInstance.put<CategoryResponse>(`/category/${id}`, payload);
    return data.category;
  },

  async remove(id: UUID): Promise<{ message: string }> {
    const { data } = await axiosInstance.delete<{ message: string }>(`/category/${id}`);
    return data;
  },
};
