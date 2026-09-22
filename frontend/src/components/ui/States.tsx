import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

/** Grey block shown while data is loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-navy-soft', className)} />
}

/** Several skeleton cards, for a product grid or a list. */
export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  )
}

/** Nothing to show yet: never leave a blank screen. */
export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-white px-6 py-14 text-center shadow-soft">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-soft text-2xl">
        ⌕
      </div>
      <h3 className="font-display text-lg font-semibold text-navy">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {action}
    </div>
  )
}

/** Something went wrong, with a way to try again. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-white px-6 py-14 text-center shadow-soft">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">
        !
      </div>
      <h3 className="font-display text-lg font-semibold text-navy">Something went wrong</h3>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
