import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCategoryTree, type CategoryNode } from '@/hooks/useCategories'
import { cn } from '@/lib/utils'

/**
 * The main categories, shown one by one in the navbar:
 *
 *   Electronics ▾   Audio ▾   Accessories ▾   Home ▾
 *
 * Clicking a name opens its sub-categories; clicking "All …" inside goes
 * to the whole category. Only one menu is open at a time.
 */
export function CategoryNav() {
  const { tree } = useCategoryTree()
  const [openId, setOpenId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [searchParams] = useSearchParams()

  const activeCategoryId = searchParams.get('category_id')

  useEffect(() => {
    if (!openId) return

    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpenId(null)
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenId(null)
    }

    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)

    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [openId])

  /** True when the page currently shows this category or one of its children. */
  function isActive(parent: CategoryNode): boolean {
    if (!activeCategoryId) return false

    return (
      parent.id === activeCategoryId ||
      parent.children.some((child) => child.id === activeCategoryId)
    )
  }

  return (
    <div ref={containerRef} className="flex items-center gap-0.5">
      {tree.map((parent) => (
        <div key={parent.id} className="relative">
          <button
            type="button"
            onClick={() => setOpenId(openId === parent.id ? null : parent.id)}
            aria-expanded={openId === parent.id}
            aria-haspopup="true"
            className={cn(
              'flex items-center gap-1 rounded-pill px-3 py-2 text-sm font-medium transition lg:px-4',
              isActive(parent) || openId === parent.id
                ? 'bg-sage-soft text-navy'
                : 'text-muted hover:text-navy',
            )}
          >
            {parent.name}
            {parent.children.length > 0 && (
              <span
                aria-hidden="true"
                className={cn('text-[0.6rem] transition', openId === parent.id && 'rotate-180')}
              >
                ▾
              </span>
            )}
          </button>

          {openId === parent.id && (
            <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-card bg-white p-2 shadow-card">
              <Link
                to={`/products?category_id=${parent.id}`}
                onClick={() => setOpenId(null)}
                className="block rounded-2xl px-4 py-2 text-sm font-medium text-navy hover:bg-sage-soft"
              >
                All {parent.name.toLowerCase()}
              </Link>

              <div className="my-1 border-t border-beige/60" />

              {parent.children.map((child) => (
                <Link
                  key={child.id}
                  to={`/products?category_id=${child.id}`}
                  onClick={() => setOpenId(null)}
                  className={cn(
                    'block rounded-2xl px-4 py-2 text-sm transition hover:bg-sage-soft hover:text-navy',
                    child.id === activeCategoryId ? 'text-navy' : 'text-muted',
                  )}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * The same categories inside the mobile menu: each main category can be
 * opened to show its sub-categories.
 */
export function MobileCategoryMenu({ onNavigate }: { onNavigate: () => void }) {
  const { tree } = useCategoryTree()
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="space-y-1">
      {tree.map((parent) => (
        <div key={parent.id}>
          <button
            type="button"
            onClick={() => setOpenId(openId === parent.id ? null : parent.id)}
            aria-expanded={openId === parent.id}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-navy"
          >
            {parent.name}
            <span aria-hidden="true" className="text-xs">
              {openId === parent.id ? '−' : '+'}
            </span>
          </button>

          {openId === parent.id && (
            <div className="space-y-1 pb-2 pl-4">
              <Link
                to={`/products?category_id=${parent.id}`}
                onClick={onNavigate}
                className="block rounded-2xl px-4 py-2 text-sm text-muted"
              >
                All {parent.name.toLowerCase()}
              </Link>

              {parent.children.map((child) => (
                <Link
                  key={child.id}
                  to={`/products?category_id=${child.id}`}
                  onClick={onNavigate}
                  className="block rounded-2xl px-4 py-2 text-sm text-muted"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
