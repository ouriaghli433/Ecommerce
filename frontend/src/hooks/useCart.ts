import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as cartApi from '@/api/cart'
import { useAuth } from '@/auth/useAuth'
import type { Cart } from '@/api/types'

export const CART_KEY = ['cart']

/**
 * The cart of the logged-in customer.
 * Every change returns the whole cart, so the cache is simply replaced with
 * the answer: no second request, and the totals always match the backend.
 */
export function useCart() {
  const { isLoggedIn } = useAuth()

  return useQuery({
    queryKey: CART_KEY,
    queryFn: cartApi.getCart,
    enabled: isLoggedIn, // a visitor has no cart
  })
}

/** How many items are in the cart (for the navbar). */
export function useCartCount(): number {
  const { data } = useCart()

  return data?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0
}

export function useCartMutations() {
  const queryClient = useQueryClient()

  const save = (cart: Cart) => queryClient.setQueryData(CART_KEY, cart)

  const addLine = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartApi.addCartLine(productId, quantity),
    onSuccess: save,
  })

  const updateLine = useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      cartApi.updateCartLine(lineId, quantity),
    onSuccess: save,
  })

  const removeLine = useMutation({
    mutationFn: (lineId: string) => cartApi.removeCartLine(lineId),
    onSuccess: save,
  })

  const clear = useMutation({
    mutationFn: cartApi.clearCart,
    onSuccess: save,
  })

  return { addLine, updateLine, removeLine, clear }
}
