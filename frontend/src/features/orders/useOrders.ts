import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/services/api';
import { queryKeys } from '@/services/api/queryKeys';
import type { UUID } from '@/types';

export function useOrders(page = 1) {
  return useQuery({
    queryKey: queryKeys.orders.all(page),
    queryFn: () => orderApi.list(page),
  });
}

export function useOrder(id: UUID | undefined, pollIntervalMs: number | false = false) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: () => orderApi.show(id!),
    enabled: Boolean(id),
    refetchInterval: pollIntervalMs,
  });
}
