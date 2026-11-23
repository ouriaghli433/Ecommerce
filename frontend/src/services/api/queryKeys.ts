import type { UUID } from '@/types';

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  categories: {
    all: ['categories'] as const,
    detail: (id: UUID) => ['categories', id] as const,
  },
  products: {
    all: ['products'] as const,
    detail: (id: UUID) => ['products', id] as const,
    images: (productId: UUID) => ['products', productId, 'images'] as const,
  },
  cart: {
    current: ['cart'] as const,
  },
  addresses: {
    all: ['addresses'] as const,
    detail: (id: UUID) => ['addresses', id] as const,
  },
  orders: {
    all: (page = 1) => ['orders', { page }] as const,
    detail: (id: UUID) => ['orders', id] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    detail: (id: UUID) => ['inventory', id] as const,
    movements: ['inventory-movements'] as const,
  },
  coupons: {
    all: ['coupons'] as const,
    detail: (id: UUID) => ['coupons', id] as const,
  },
  shipping: {
    cities: ['shipping-cities'] as const,
    all: (page = 1) => ['shipping-prices', { page }] as const,
    detail: (id: UUID) => ['shipping-prices', id] as const,
  },
};
