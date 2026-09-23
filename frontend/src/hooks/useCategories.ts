import { useQuery } from '@tanstack/react-query'
import { listCategories } from '@/api/catalog'
import type { Category } from '@/api/types'

export interface CategoryNode extends Category {
  children: Category[]
}

/**
 * The API sends one flat list of categories, each one carrying its
 * parent_id. This turns that list into a small tree:
 *
 *   Electronics -> Phones, Laptops, Tablets
 *   Audio       -> Headphones, Speakers
 *
 * Categories are cached for 5 minutes: they change very rarely, and the
 * menu is on every page.
 */
export function useCategoryTree() {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 5 * 60 * 1000,
  })

  const all = query.data ?? []

  const tree: CategoryNode[] = all
    .filter((category) => category.parent_id === null)
    .map((parent) => ({
      ...parent,
      children: all.filter((category) => category.parent_id === parent.id),
    }))

  // The categories that really hold products (the ones with no children).
  const leaves = all.filter(
    (category) => !all.some((other) => other.parent_id === category.id),
  )

  return { ...query, all, tree, leaves }
}
