import type { CreateRefundPayload, UUID } from '@/types';
import { categoryApi } from './categoryApi';
import { couponApi } from './couponApi';
import { inventoryApi } from './inventoryApi';
import { orderApi } from './orderApi';
import { paymentApi } from './paymentApi';
import { productApi } from './productApi';
import { shippingApi } from './shippingApi';

export const adminApi = {
  categories: categoryApi,
  products: productApi,
  inventory: inventoryApi,
  orders: orderApi,
  coupons: couponApi,
  shipping: shippingApi,
  refunds: {
    create: (paymentId: UUID, payload: CreateRefundPayload) =>
      paymentApi.createRefund(paymentId, payload),
  },
};
