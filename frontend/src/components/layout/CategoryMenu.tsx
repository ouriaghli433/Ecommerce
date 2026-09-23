import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategoryTree } from '@/hooks/useCategories'
import { cn } from '@/lib/utils'

/**
 * The "Shop" menu of the navbar: main categories with their
 * sub-categories. Opens on click, closes on Escape or a click outside.
 */
export function CategoryMenu() {
  const { tree } = useCategoryTree()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)

    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'flex items-center gap-1.5 rounded-pill px-4 py-2 text-sm font-medium transition',
          open ? 'bg-sage-soft text-navy' : 'text-muted hover:text-navy',
        )}
      >
        Shop
        <span aria-hidden="true" className={cn('text-xs transition', open && 'rotate-180')}>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(90vw,44rem)] rounded-card bg-white p-6 shadow-card">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {tree.map((parent) => (
              <div key={parent.id} className="space-y-2">
                <Link
                  to={`/products?category_id=${parent.id}`}
                  onClick={() => setOpen(false)}
                  className="block font-display text-sm font-semibold text-navy hover:underline"
                >
                  {parent.name}
                </Link>

                <ul className="space-y-1">
                  {parent.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        to={`/products?category_id=${child.id}`}
                        onClick={() => setOpen(false)}
                        className="block text-sm text-muted transition hover:text-navy"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Link
            to="/products"
            onClick={() => setOpen(false)}
            className="mt-6 block border-t border-beige/60 pt-4 text-sm font-medium text-navy hover:underline"
          >
            See the whole catalogue →
          </Link>
        </div>
      )}
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
