import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A product picture with a calm fallback.
 *
 * Products may have no picture yet, and a URL can fail to load, so both
 * cases show the same soft surface with the product initials instead of a
 * broken image.
 */
export function ProductThumb({
  name,
  url,
  alt,
  className,
  textClassName,
}: {
  name: string
  url?: string | null
  alt?: string | null
  className?: string
  textClassName?: string
}) {
  const [failed, setFailed] = useState(false)

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  if (!url || failed) {
    return (
      <div
        className={cn('flex items-center justify-center bg-sage-soft', className)}
        aria-hidden="true"
      >
        <span className={cn('font-display font-semibold text-navy/60', textClassName ?? 'text-3xl')}>
          {initials}
        </span>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt ?? name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  )
}
