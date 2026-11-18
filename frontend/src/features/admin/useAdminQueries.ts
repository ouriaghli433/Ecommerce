import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { adminApi } from '@/services/api';
import { queryKeys } from '@/services/api/queryKeys';
import type {
  CategoryPayload,
  CouponPayload,
  CreateInventoryMovementPayload,
  CreateRefundPayload,
  ProductImagePayload,
  ProductPayload,
  ShippingPricePayload,
  UpdateOrderStatusPayload,
  UUID,
} from '@/types';

// Inventory
export function useAdminInventory() {
  return useQuery({
    queryKey: queryKeys.inventory.all,
    queryFn: adminApi.inventory.list,
  });
}

export function useAdminInventoryMovements() {
  return useQuery({
    queryKey: queryKeys.inventory.movements,
    queryFn: adminApi.inventory.listMovements,
  });
}

export function useCreateInventoryMovement() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: CreateInventoryMovementPayload) =>
      adminApi.inventory.createMovement(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movements });
      toast.success('Movement recorded', res.message);
    },
  });
}

// Coupons
export function useAdminCoupons() {
  return useQuery({
    queryKey: queryKeys.coupons.all,
    queryFn: adminApi.coupons.list,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: CouponPayload) => adminApi.coupons.create(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all });
      toast.success('Coupon created', res.message ?? 'Coupon saved.');
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload: Partial<CouponPayload> }) =>
      adminApi.coupons.update(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all });
      toast.success('Coupon updated', res.message ?? 'Coupon updated.');
    },
  });
}

export function useDisableCoupon() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: UUID) => adminApi.coupons.disable(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all });
      toast.info('Coupon disabled', res.message);
    },
  });
}

// Shipping Prices
export function useAdminShippingPrices(page = 1) {
  return useQuery({
    queryKey: queryKeys.shipping.all(page),
    queryFn: () => adminApi.shipping.list(page),
  });
}

export function useCreateShippingPrice() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: ShippingPricePayload) => adminApi.shipping.create(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shipping-prices'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.shipping.cities });
      toast.success('Shipping price created', res.message);
    },
  });
}

export function useUpdateShippingPrice() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload: Partial<ShippingPricePayload> }) =>
      adminApi.shipping.update(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shipping-prices'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.shipping.cities });
      toast.success('Shipping price updated', res.message);
    },
  });
}

export function useDisableShippingPrice() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: UUID) => adminApi.shipping.disable(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shipping-prices'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.shipping.cities });
      toast.info('Shipping price disabled', res.message);
    },
  });
}

// Categories
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: CategoryPayload) => adminApi.categories.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      toast.success('Category created');
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload: Partial<CategoryPayload> }) =>
      adminApi.categories.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      toast.success('Category updated');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: UUID) => adminApi.categories.remove(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      toast.info('Category deleted', res.message);
    },
  });
}

// Products & Images
export function useCreateProduct() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: ProductPayload) => adminApi.products.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Product created', 'Initial inventory record was automatically initialized.');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload: Partial<ProductPayload> }) =>
      adminApi.products.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Product updated');
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: UUID) => adminApi.products.archive(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.info('Product archived', res.message);
    },
  });
}

export function useProductImages(productId: UUID | undefined) {
  return useQuery({
    queryKey: queryKeys.products.images(productId ?? ''),
    queryFn: () => adminApi.products.listImages(productId!),
    enabled: Boolean(productId),
  });
}

export function useAddProductImage(productId: UUID) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: ProductImagePayload) =>
      adminApi.products.addImage(productId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.images(productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success('Image added', res.message);
    },
  });
}

export function useUpdateProductImage(productId: UUID) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      imageId,
      payload,
    }: {
      imageId: UUID;
      payload: Partial<ProductImagePayload>;
    }) => adminApi.products.updateImage(productId, imageId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.images(productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success('Image updated', res.message);
    },
  });
}

export function useDeleteProductImage(productId: UUID) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (imageId: UUID) => adminApi.products.deleteImage(productId, imageId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.images(productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.info('Image removed', res.message);
    },
  });
}

// Orders & Refunds
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: UUID; payload: UpdateOrderStatusPayload }) =>
      adminApi.orders.updateStatus(orderId, payload),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      toast.success('Order updated', res.message);
    },
  });
}

export function useCreateRefund() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ paymentId, payload }: { paymentId: UUID; payload: CreateRefundPayload }) =>
      adminApi.refunds.create(paymentId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Refund processed', res.message);
    },
  });
}
