import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { addressApi, shippingApi } from '@/services/api';
import { queryKeys } from '@/services/api/queryKeys';
import type { AddressPayload, UUID } from '@/types';

export function useShippingCities(enabled = true) {
  return useQuery({
    queryKey: queryKeys.shipping.cities,
    queryFn: shippingApi.listCities,
    enabled,
    staleTime: 60_000,
  });
}

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: queryKeys.addresses.all,
    queryFn: addressApi.list,
    enabled,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: AddressPayload) => addressApi.create(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all });
      toast.success('Address saved', res.message);
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload: Partial<AddressPayload> }) =>
      addressApi.update(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all });
      toast.success('Address updated', res.message);
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: UUID) => addressApi.remove(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all });
      toast.info('Address deleted', res.message);
    },
  });
}
