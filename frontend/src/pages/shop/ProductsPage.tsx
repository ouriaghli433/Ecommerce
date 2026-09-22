import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getErrorMessage } from '@/api/client'
import { listCategories, listProducts } from '@/api/catalog'
import { ProductCard } from '@/components/shop/ProductCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/ui/States'
import { cn } from '@/lib/utils'

/**
 * The filters live in the URL (?search=&category_id=&page=), so a filtered
 * list can be shared, bookmarked, and the back button works.
 */
export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('category_id') ?? ''
  const page = Number(searchParams.get('page') ?? 1)

  const [searchInput, setSearchInput] = useState(search)

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })

  const productsQuery = useQuery({
    queryKey: ['products', { search, categoryId, page }],
    queryFn: () =>
      listProducts({
        search: search || undefined,
        category_id: categoryId || undefined,
        page,
      }),
  })

  function applyFilters(next: { search?: string; category_id?: string; page?: number }) {
    const params = new URLSearchParams(searchParams)

    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '' || value === 1) params.delete(key)
      else params.set(key, String(value))
    }

    // Any new filter starts again at page 1.
    if (next.page === undefined) params.delete('page')

    setSearchParams(params)
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault()
    applyFilters({ search: searchInput })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-navy">Shop</h1>
        <p className="text-sm text-muted">
          {productsQuery.data
            ? `${productsQuery.data.meta.total} product(s)`
            : 'Loading the catalogue…'}
        </p>
      </header>

      <form onSubmit={onSearchSubmit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search"
            placeholder="iPhone, charger, mug…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <Button type="submit" variant="secondary">
          Search
        </Button>

        {(search || categoryId) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearchInput('')
              setSearchParams(new URLSearchParams())
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyFilters({ category_id: '' })}
          className={cn(
            'rounded-pill px-4 py-2 text-sm transition',
            categoryId === '' ? 'bg-navy text-white' : 'bg-white text-muted hover:text-navy',
          )}
        >
          All
        </button>

        {categoriesQuery.data?.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => applyFilters({ category_id: category.id })}
            className={cn(
              'rounded-pill px-4 py-2 text-sm transition',
              categoryId === category.id
                ? 'bg-navy text-white'
                : 'bg-white text-muted hover:text-navy',
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {productsQuery.isPending && <SkeletonGrid />}

      {productsQuery.isError && (
        <ErrorState
          message={getErrorMessage(productsQuery.error)}
          onRetry={() => productsQuery.refetch()}
        />
      )}

      {productsQuery.data && productsQuery.data.data.length === 0 && (
        <EmptyState
          title="No product matches"
          message="Try another word, or remove the category filter."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchInput('')
                setSearchParams(new URLSearchParams())
              }}
            >
              Show everything
            </Button>
          }
        />
      )}

      {productsQuery.data && productsQuery.data.data.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {productsQuery.data.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <Pagination
            currentPage={productsQuery.data.meta.current_page}
            lastPage={productsQuery.data.meta.last_page}
            onPageChange={(nextPage) => applyFilters({ page: nextPage })}
          />
        </>
      )}
    </div>
  )
}
