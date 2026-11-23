/**
 * Backend stores monetary amounts in integer centimes (1 MAD = 100 centimes).
 */
export function formatMoney(amountInCentimes: number, currency = 'MAD'): string {
  const major = amountInCentimes / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);

  return `${formatted} ${currency.toUpperCase()}`;
}

export function centimesToMajor(centimes: number): string {
  return (centimes / 100).toFixed(2);
}

export function majorToCentimes(majorAmount: number | string): number {
  const parsed = typeof majorAmount === 'string' ? Number.parseFloat(majorAmount) : majorAmount;
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100);
}
