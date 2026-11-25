import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartUiState {
  guestToken: string | null;
  isDrawerOpen: boolean;
  setGuestToken: (token: string | null) => void;
  clearGuestToken: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

export const useCartStore = create<CartUiState>()(
  persist(
    (set) => ({
      guestToken: null,
      isDrawerOpen: false,
      setGuestToken: (guestToken) => set({ guestToken }),
      clearGuestToken: () => set({ guestToken: null }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
    }),
    {
      name: 'ecommerce_guest_cart_storage',
      partialize: (state) => ({ guestToken: state.guestToken }),
    }
  )
);
