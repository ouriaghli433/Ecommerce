import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/services/api';
import { queryKeys } from '@/services/api/queryKeys';
import type { UUID } from '@/types';

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all,
    queryFn: productApi.list,
  });
}

export function useProduct(id: UUID | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id ?? ''),
    queryFn: () => productApi.show(id!),
    enabled: Boolean(id),
  });
}
