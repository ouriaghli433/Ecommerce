import { api } from './client'
import type { Category, Paginated, Product, ProductImage, Single } from './types'

export interface ProductFilters {
  search?: string
  category_id?: string
  page?: number
}

/** GET /products — public, paginated, 15 per page. */
export async function listProducts(filters: ProductFilters = {}): Promise<Paginated<Product>> {
  const { data } = await api.get<Paginated<Product>>('/products', { params: filters })

  return data
}

/** GET /products/{id} — includes available_stock read live. */
export async function getProduct(id: string): Promise<Product> {
  const { data } = await api.get<Single<Product>>(`/products/${id}`)

  return data.data
}

/** GET /categories — public, not paginated. */
export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<{ data: Category[] }>('/categories')

  return data.data
}

export async function getCategory(id: string): Promise<Category> {
  const { data } = await api.get<Single<Category>>(`/categories/${id}`)

  return data.data
}

/* ---------- admin ---------- */

export interface CategoryPayload {
  name: string
  slug: string
  description?: string | null
  is_active?: boolean
  parent_id?: string | null
}

export async function createCategory(payload: CategoryPayload): Promise<Category> {
  const { data } = await api.post<Single<Category>>('/categories', payload)

  return data.data
}

export async function updateCategory(
  id: string,
  payload: Partial<CategoryPayload>,
): Promise<Category> {
  const { data } = await api.patch<Single<Category>>(`/categories/${id}`, payload)

  return data.data
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`)
}

export interface ProductPayload {
  name: string
  slug: string
  sku: string
  price: number
  category_id: string
  description?: string | null
  is_active?: boolean
  attributes?: Record<string, string> | null
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const { data } = await api.post<Single<Product>>('/products', payload)

  return data.data
}

export async function updateProduct(
  id: string,
  payload: Partial<ProductPayload>,
): Promise<Product> {
  const { data } = await api.patch<Single<Product>>(`/products/${id}`, payload)

  return data.data
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`)
}

/* ---------- product pictures (admin) ---------- */

export async function listProductImages(productId: string): Promise<ProductImage[]> {
  const { data } = await api.get<{ data: ProductImage[] }>(`/products/${productId}/images`)

  return data.data
}

/**
 * Adds a picture, either chosen from the computer or taken from an address.
 * The first picture of a product becomes the main one by itself, which is
 * what the lists show.
 */
export async function addProductImage(
  productId: string,
  payload: { file?: File; url?: string; alt_text?: string; is_primary?: boolean },
): Promise<ProductImage> {
  if (payload.file) {
    // A file cannot travel as JSON: it goes as form data, and the browser
    // sets the right content type by itself.
    const form = new FormData()

    form.append('file', payload.file)
    if (payload.alt_text) form.append('alt_text', payload.alt_text)
    if (payload.is_primary) form.append('is_primary', '1')

    const { data } = await api.post<Single<ProductImage>>(
      `/products/${productId}/images`,
      form,
    )

    return data.data
  }

  const { data } = await api.post<Single<ProductImage>>(`/products/${productId}/images`, {
    url: payload.url,
    alt_text: payload.alt_text,
    is_primary: payload.is_primary,
  })

  return data.data
}

export async function setPrimaryProductImage(
  productId: string,
  imageId: string,
): Promise<ProductImage> {
  const { data } = await api.patch<Single<ProductImage>>(
    `/products/${productId}/images/${imageId}`,
    { is_primary: true },
  )

  return data.data
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  await api.delete(`/products/${productId}/images/${imageId}`)
}
