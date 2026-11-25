import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { authApi } from '@/services/api';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import type { LoginPayload, RegisterPayload } from '@/types';

export function useMe() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const { user } = await authApi.me();
      useAuthStore.getState().setUser(user);
      return user;
    },
    enabled: Boolean(token),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const clearGuestToken = useCartStore((s) => s.clearGuestToken);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: async (data) => {
      setSession(data.token, data.user);
      clearGuestToken();
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.current });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const clearGuestToken = useCartStore((s) => s.clearGuestToken);

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: async (data) => {
      setSession(data.token, {
        ...data.customer,
        role: data.customer.role ?? 'customer',
      });
      clearGuestToken();
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.current });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);
  const toast = useToast();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearSession();
      queryClient.clear();
      toast.info('Signed out', 'Your session has been closed.');
    },
  });
}
