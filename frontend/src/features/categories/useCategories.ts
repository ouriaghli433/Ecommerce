import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '@/services/api';
import { queryKeys } from '@/services/api/queryKeys';
import type { Category, UUID } from '@/types';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: categoryApi.list,
  });
}

export function useActiveCategories() {
  const query = useCategories();
  const activeCategories = useMemo(
    () => (query.data ?? []).filter((category) => category.is_active),
    [query.data]
  );

  return {
    ...query,
    data: activeCategories,
  };
}

export function useCategoryMap(): Map<UUID, Category> {
  const { data } = useCategories();
  return useMemo(() => {
    const map = new Map<UUID, Category>();
    for (const category of data ?? []) {
      map.set(category.id, category);
    }
    return map;
  }, [data]);
}
