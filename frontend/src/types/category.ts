import type { UUID } from './common';

export interface Category {
  id: UUID;
  parent_id: UUID | null;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryPayload {
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface CategoryResponse {
  category: Category;
}
