import type { SelectHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

export function Select({
  label,
  error,
  options,
  placeholder,
  className,
  id,
  ...props
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-navy">
          {label}
        </label>
      )}

      <select
        {...props}
        id={selectId}
        className={cn(
          'h-11 w-full rounded-2xl border bg-white px-4 text-sm text-navy transition',
          error ? 'border-red-400' : 'border-beige focus:border-sage',
          className,
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
