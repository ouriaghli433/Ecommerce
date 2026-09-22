import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A table that can be scrolled sideways on a phone instead of breaking
 * the page layout.
 */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'border-b border-beige/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn('border-b border-beige/40 px-4 py-3 align-middle text-navy', className)}>
      {children}
    </td>
  )
}
