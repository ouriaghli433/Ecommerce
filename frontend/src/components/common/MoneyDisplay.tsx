import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';

interface MoneyDisplayProps {
  amountInCentimes: number;
  currency?: string;
  className?: string;
}

export function MoneyDisplay({
  amountInCentimes,
  currency = 'MAD',
  className,
}: MoneyDisplayProps) {
  return (
    <span className={cn('tabular-nums', className)}>
      {formatMoney(amountInCentimes, currency)}
    </span>
  );
}
