import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * The header every admin page starts with: where you are, what the page is
 * for, and the main action on the right.
 */
export function AdminPageHeader({
  title,
  description,
  action,
  backTo,
  backLabel,
}: {
  title: string
  description?: string
  action?: ReactNode
  backTo?: string
  backLabel?: string
}) {
  return (
    <header className="mb-8 space-y-3">
      {backTo && (
        <Link to={backTo} className="text-sm text-muted transition hover:text-navy">
          ← {backLabel ?? 'Back'}
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold text-navy sm:text-3xl">{title}</h1>
          {description && <p className="max-w-2xl text-sm text-muted">{description}</p>}
        </div>

        {action}
      </div>
    </header>
  )
}

/**
 * One number on the dashboard: a label, the value, and a short line saying
 * what it means.
 */
export function StatCard({
  label,
  value,
  hint,
  to,
  tone = 'plain',
}: {
  label: string
  value: string | number
  hint?: string
  to?: string
  tone?: 'plain' | 'sage' | 'warning'
}) {
  const tones = {
    plain: 'bg-white',
    sage: 'bg-sage-soft',
    warning: 'bg-beige-soft',
  }

  const content = (
    <div
      className={cn(
        'h-full rounded-card p-5 shadow-soft transition',
        tones[tone],
        to && 'hover:-translate-y-0.5 hover:shadow-card',
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )

  return to ? <Link to={to}>{content}</Link> : content
}

/** A white block with a title, used to group content on admin pages. */
export function AdminCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-card bg-white shadow-soft', className)}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-beige/60 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-navy">{title}</h2>
          {action}
        </div>
      )}

      <div className={cn(bodyClassName ?? 'p-5')}>{children}</div>
    </section>
  )
}
