import type { Product, ProductAttributes, ProductImage } from '@/types';

export function parseProductAttributes(
  raw: Product['attributes']
): ProductAttributes | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'string') {
        const doubleParsed: unknown = JSON.parse(parsed);
        return typeof doubleParsed === 'object' && doubleParsed !== null
          ? (doubleParsed as ProductAttributes)
          : null;
      }
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as ProductAttributes)
        : null;
    } catch {
      return null;
    }
  }
  return raw;
}

export function getPrimaryProductImage(product?: Pick<Product, 'images'> | null): ProductImage | null {
  const images = product?.images;
  if (!images || images.length === 0) return null;
  const primary = images.find((img) => img.is_primary);
  if (primary) return primary;
  return [...images].sort((a, b) => a.display_order - b.display_order)[0] ?? null;
}

export function getSortedProductImages(product?: Pick<Product, 'images'> | null): ProductImage[] {
  const images = product?.images;
  if (!images || images.length === 0) return [];
  return [...images].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.display_order - b.display_order;
  });
}
