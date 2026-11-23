import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';

interface AuthState {
  token: string | null;
  user: User | null;
  isHydrated: boolean;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isHydrated: false,
      setSession: (token, user) =>
        set({
          token,
          user: { ...user, role: user.role ?? 'customer' },
          isHydrated: true,
        }),
      setUser: (user) =>
        set({
          user: { ...user, role: user.role ?? 'customer' },
          isHydrated: true,
        }),
      clearSession: () => set({ token: null, user: null, isHydrated: true }),
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: 'ecommerce_auth_storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

export function getUserRole(user: User | null): UserRole | null {
  if (!user) return null;
  return user.role ?? 'customer';
}
