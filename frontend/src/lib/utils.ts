/**
 * Small helpers used everywhere in the interface.
 */

/**
 * Joins CSS classes and ignores the empty ones.
 * cn('p-2', isActive && 'bg-sage') -> "p-2 bg-sage"
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * The API always sends money as an integer in centimes: 129900 = 1 299,00 MAD.
 * Never do maths on the displayed string; keep the centimes for calculations.
 */
export function formatMoney(centimes: number, currency = 'MAD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(centimes / 100)
}

/** "22 Sep 2026, 14:05" */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

/** "pending_payment" -> "Pending payment" */
export function humanize(value: string): string {
  const withSpaces = value.replaceAll('_', ' ')

  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

/** Shows the first 8 characters of a UUID, enough to recognise a row. */
export function shortId(id: string): string {
  return id.slice(0, 8)
}
