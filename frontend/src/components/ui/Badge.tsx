import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

import type { Tone } from '@/lib/status'

const tones: Record<Tone, string> = {
  neutral: 'bg-navy-soft text-muted',
  sage: 'bg-sage-soft text-navy',
  navy: 'bg-navy text-white',
  beige: 'bg-beige-soft text-navy',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
