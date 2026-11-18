import { axiosInstance } from '@/services/http/axiosInstance';
import type {
  Product,
  ProductImage,
  ProductImagePayload,
  ProductImageResponse,
  ProductImagesResponse,
  ProductPayload,
  ProductResponse,
  ProductsResponse,
  UUID,
} from '@/types';

export const productApi = {
  async list(): Promise<Product[]> {
    const { data } = await axiosInstance.get<ProductsResponse>('/product');
    return data.products;
  },

  async show(id: UUID): Promise<Product> {
    const { data } = await axiosInstance.get<ProductResponse>(`/product/${id}`);
    return data.product;
  },

  async create(payload: ProductPayload): Promise<Product> {
    const { data } = await axiosInstance.post<ProductResponse>('/product', payload);
    return data.product;
  },

  async update(id: UUID, payload: Partial<ProductPayload>): Promise<Product> {
    const { data } = await axiosInstance.put<ProductResponse>(`/product/${id}`, payload);
    return data.product;
  },

  async archive(id: UUID): Promise<ProductResponse> {
    const { data } = await axiosInstance.delete<ProductResponse>(`/product/${id}`);
    return data;
  },

  async listImages(productId: UUID): Promise<ProductImage[]> {
    const { data } = await axiosInstance.get<ProductImagesResponse>(
      `/products/${productId}/images`
    );
    return data.images;
  },

  async addImage(productId: UUID, payload: ProductImagePayload): Promise<ProductImageResponse> {
    const { data } = await axiosInstance.post<ProductImageResponse>(
      `/products/${productId}/images`,
      payload
    );
    return data;
  },

  async updateImage(
    productId: UUID,
    imageId: UUID,
    payload: Partial<ProductImagePayload>
  ): Promise<ProductImageResponse> {
    const { data } = await axiosInstance.put<ProductImageResponse>(
      `/products/${productId}/images/${imageId}`,
      payload
    );
    return data;
  },

  async deleteImage(productId: UUID, imageId: UUID): Promise<{ message: string }> {
    const { data } = await axiosInstance.delete<{ message: string }>(
      `/products/${productId}/images/${imageId}`
    );
    return data;
  },
};
