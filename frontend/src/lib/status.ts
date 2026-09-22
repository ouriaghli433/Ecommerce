export type Tone = 'neutral' | 'sage' | 'navy' | 'beige' | 'success' | 'warning' | 'danger'

/**
 * One place decides the colour of every order, payment and refund status,
 * so the same status always looks the same in the whole application.
 */
export function statusTone(status: string): Tone {
  switch (status) {
    case 'paid':
    case 'delivered':
    case 'succeeded':
    case 'active':
      return 'success'
    case 'pending_payment':
    case 'pending':
    case 'processing':
    case 'shipped':
      return 'warning'
    case 'cancelled':
    case 'expired':
    case 'failed':
      return 'danger'
    default:
      return 'neutral'
  }
}
