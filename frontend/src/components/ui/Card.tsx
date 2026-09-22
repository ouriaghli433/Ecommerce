import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/** The soft rounded white surface used everywhere in the design. */
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div {...props} className={cn('rounded-card bg-white shadow-soft', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-beige/60 px-6 py-4">
      <h2 className="font-display text-lg font-semibold text-navy">{title}</h2>
      {action}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-6', className)}>{children}</div>
}
