import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { cartApi } from '@/services/api';
import { queryKeys } from '@/services/api/queryKeys';
import { parseApiError } from '@/services/http/errorParser';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import type { AddToCartPayload, CartResponse, UUID } from '@/types';

export function useCart(forceFetch = false) {
  const token = useAuthStore((s) => s.token);
  const guestToken = useCartStore((s) => s.guestToken);
  const setGuestToken = useCartStore((s) => s.setGuestToken);

  const query = useQuery({
    queryKey: queryKeys.cart.current,
    queryFn: async () => {
      const res = await cartApi.get();
      if (!token && res.guest_token) {
        setGuestToken(res.guest_token);
      }
      return res;
    },
    enabled: forceFetch || Boolean(token) || Boolean(guestToken),
  });

  const cartLines = query.data?.cart.cart_lines ?? [];
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cartLines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);

  return {
    ...query,
    cart: query.data?.cart ?? null,
    cartLines,
    itemCount,
    subtotal,
  };
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const setGuestToken = useCartStore((s) => s.setGuestToken);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: AddToCartPayload) => cartApi.addItem(payload),
    onSuccess: (res: CartResponse) => {
      if (!token && res.guest_token) {
        setGuestToken(res.guest_token);
      }
      queryClient.setQueryData(queryKeys.cart.current, res);
      toast.success('Added to cart', res.message ?? 'Item added to your shopping bag.');
      openDrawer();
    },
    onError: (err) => {
      toast.error('Could not add item', parseApiError(err).message);
    },
  });
}

export function useUpdateCartLine() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const setGuestToken = useCartStore((s) => s.setGuestToken);
  const toast = useToast();

  return useMutation({
    mutationFn: ({ cartLineId, quantity }: { cartLineId: UUID; quantity: number }) =>
      cartApi.updateItem(cartLineId, { quantity }),
    onSuccess: (res: CartResponse) => {
      if (!token && res.guest_token) {
        setGuestToken(res.guest_token);
      }
      queryClient.setQueryData(queryKeys.cart.current, res);
    },
    onError: (err) => {
      toast.error('Quantity update failed', parseApiError(err).message);
    },
  });
}

export function useRemoveCartLine() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const setGuestToken = useCartStore((s) => s.setGuestToken);
  const toast = useToast();

  return useMutation({
    mutationFn: (cartLineId: UUID) => cartApi.removeItem(cartLineId),
    onSuccess: (res: CartResponse) => {
      if (!token && res.guest_token) {
        setGuestToken(res.guest_token);
      }
      queryClient.setQueryData(queryKeys.cart.current, res);
      toast.info('Item removed', 'The item was removed from your cart.');
    },
    onError: (err) => {
      toast.error('Could not remove item', parseApiError(err).message);
    },
  });
}
