import type { UUID } from './common';
import type { Inventory } from './inventory';

export interface ProductImage {
  id: UUID;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  product_id: UUID;
  created_at: string;
  updated_at: string;
}

export interface ProductImagePayload {
  image_url: string;
  alt_text?: string | null;
  display_order?: number;
  is_primary?: boolean;
}

export type ProductAttributes = Record<string, string | number | boolean | null>;

export interface Product {
  id: UUID;
  name: string;
  slug: string;
  sku: string;
  price: number;
  description: string | null;
  is_active: boolean;
  attributes: ProductAttributes | string | null;
  category_id: UUID;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  inventory?: Inventory;
}

export interface ProductPayload {
  name: string;
  slug: string;
  sku: string;
  price: number;
  description?: string | null;
  is_active: boolean;
  attributes?: string | null;
  category_id: UUID;
}

export interface ProductsResponse {
  products: Product[];
}

export interface ProductResponse {
  product: Product;
  message?: string;
}

export interface ProductImagesResponse {
  images: ProductImage[];
}

export interface ProductImageResponse {
  image: ProductImage;
  message?: string;
}
