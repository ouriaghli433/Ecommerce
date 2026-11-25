import { useMemo } from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ErrorState, PageHeader } from '@/components/common';
import { Button, EmptyState, Input, Pagination, ProductCardSkeleton, Select } from '@/components/ui';
import { useActiveCategories, useCategoryMap } from '@/features/categories/useCategories';
import { cn } from '@/utils/cn';
import { ProductCard } from './ProductCard';
import { useProducts } from './useProducts';

type SortOption = 'latest' | 'price_asc' | 'price_desc' | 'name_asc';
const PAGE_SIZE = 12;

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryText = searchParams.get('q') ?? '';
  const selectedCategory = searchParams.get('category') ?? '';
  const sortBy = (searchParams.get('sort') as SortOption | null) ?? 'latest';
  const currentPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const productsQuery = useProducts();
  const categoriesQuery = useActiveCategories();
  const categoryMap = useCategoryMap();

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') {
      next.delete('page');
    }
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const filteredAndSorted = useMemo(() => {
    const all = productsQuery.data ?? [];
    const normalizedQuery = queryText.trim().toLowerCase();

    const filtered = all.filter((product) => {
      if (selectedCategory && product.category_id !== selectedCategory) {
        return false;
      }
      if (!normalizedQuery) return true;
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.sku.toLowerCase().includes(normalizedQuery) ||
        (product.description ?? '').toLowerCase().includes(normalizedQuery)
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'latest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [productsQuery.data, queryText, selectedCategory, sortBy]);

  const totalItems = filteredAndSorted.length;
  const lastPage = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(currentPage, lastPage);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, safePage]);

  const hasActiveFilters = Boolean(queryText || selectedCategory || sortBy !== 'latest');

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Product Catalog"
        description="Browse active store products. Search, category filtering, and sorting run locally on the live catalog."
        actions={
          hasActiveFilters ? (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Reset filters
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Category Filter Sidebar */}
        <aside className="space-y-4 lg:col-span-3">
          <div className="rounded-[22px] bg-[#F4F5F7] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <SlidersHorizontal className="h-4 w-4 text-[#2454E8]" />
              <span>Categories</span>
            </div>
            <div className="flex flex-wrap gap-1.5 lg:flex-col">
              <button
                type="button"
                onClick={() => updateParam('category', '')}
                className={cn(
                  'rounded-full px-3.5 py-2 text-left text-sm transition-colors',
                  selectedCategory === ''
                    ? 'bg-[#2454E8] font-semibold text-white'
                    : 'text-slate-700 hover:bg-white/80'
                )}
              >
                All Categories
              </button>
              {categoriesQuery.data.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => updateParam('category', category.id)}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-left text-sm transition-colors',
                    selectedCategory === category.id
                      ? 'bg-[#2454E8] font-semibold text-white'
                      : 'text-slate-700 hover:bg-white/80'
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Grid */}
        <div className="space-y-6 lg:col-span-9">
          <div className="flex flex-col gap-3 rounded-[22px] bg-[#F4F5F7] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <Input
                type="search"
                value={queryText}
                onChange={(e) => updateParam('q', e.target.value)}
                placeholder="Search by name, SKU, description..."
                aria-label="Filter catalog products"
                leftElement={<Search className="h-4 w-4" />}
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="shrink-0 text-xs font-medium text-slate-500 tabular-nums">
                {totalItems} {totalItems === 1 ? 'product' : 'products'}
              </span>
              <div className="w-48">
                <Select
                  aria-label="Sort products"
                  value={sortBy}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  options={[
                    { value: 'latest', label: 'Newest arrivals' },
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'name_asc', label: 'Name: A to Z' },
                  ]}
                />
              </div>
            </div>
          </div>

          {productsQuery.isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <ProductCardSkeleton key={idx} />
              ))}
            </div>
          ) : productsQuery.isError ? (
            <ErrorState
              title="Failed to load catalog"
              error={productsQuery.error}
              onRetry={() => productsQuery.refetch()}
            />
          ) : paginatedProducts.length === 0 ? (
            <EmptyState
              title="No matching products"
              description="Try adjusting your search query or clearing the category filter."
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    category={categoryMap.get(product.category_id)}
                  />
                ))}
              </div>
              <Pagination
                currentPage={safePage}
                lastPage={lastPage}
                total={totalItems}
                onPageChange={(page) => updateParam('page', String(page))}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
