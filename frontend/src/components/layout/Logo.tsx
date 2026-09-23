import { cn } from '@/lib/utils'

/**
 * The mark: a rounded navy square holding a sage leaf.
 * Simple enough to stay readable at 24px in the browser tab.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-hidden="true"
      className={cn('h-8 w-8', className)}
    >
      <rect width="32" height="32" rx="9" fill="#1E2D4C" />
      {/* the leaf */}
      <path
        d="M22.5 8.5c0 6.2-4.1 10.6-9.8 11.4-.6.08-1.2.1-1.7.1 .4-6 4.5-10.4 11.5-11.5Z"
        fill="#ACBDAA"
      />
      {/* the stem */}
      <path
        d="M9 24c1.6-4.6 4.6-8 8.9-10.2"
        stroke="#CEC0BB"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/** The mark plus the name, used in the navbar and the admin sidebar. */
export function Logo({
  className,
  tone = 'dark',
  showName = true,
}: {
  className?: string
  tone?: 'dark' | 'light'
  showName?: boolean
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />

      {showName && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display text-lg font-semibold tracking-tight',
              tone === 'light' ? 'text-white' : 'text-navy',
            )}
          >
            Verdant
          </span>
          <span
            className={cn(
              'text-[0.6rem] uppercase tracking-[0.18em]',
              tone === 'light' ? 'text-white/60' : 'text-muted',
            )}
          >
            Maroc
          </span>
        </span>
      )}
    </span>
  )
}
