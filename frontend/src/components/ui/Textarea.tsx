import type { TextareaHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-navy">
          {label}
        </label>
      )}

      <textarea
        {...props}
        id={textareaId}
        className={cn(
          'w-full rounded-2xl border bg-white px-4 py-3 text-sm text-navy transition',
          error ? 'border-red-400' : 'border-beige focus:border-sage',
          className,
        )}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
