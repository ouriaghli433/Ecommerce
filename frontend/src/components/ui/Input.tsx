import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** Message coming from the API (422) or from a local check. */
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-navy">
          {label}
        </label>
      )}

      <input
        {...props}
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn(
          'h-11 w-full rounded-2xl border bg-white px-4 text-sm text-navy transition',
          'placeholder:text-muted/70 disabled:bg-navy-soft/40 disabled:text-muted',
          error ? 'border-red-400' : 'border-beige focus:border-sage',
          className,
        )}
      />

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
