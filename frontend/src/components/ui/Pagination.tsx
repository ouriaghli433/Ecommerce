import { Button } from './Button'

interface PaginationProps {
  /** Comes from the Laravel paginator: meta.current_page and meta.last_page. */
  currentPage: number
  lastPage: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, lastPage, onPageChange }: PaginationProps) {
  if (lastPage <= 1) return null

  return (
    <nav className="flex items-center justify-center gap-3 py-6" aria-label="Pages">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>

      <span className="text-sm text-muted">
        Page <span className="font-semibold text-navy">{currentPage}</span> of {lastPage}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= lastPage}
      >
        Next
      </Button>
    </nav>
  )
}
