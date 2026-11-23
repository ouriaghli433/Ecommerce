import { Minus, Package, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MoneyDisplay } from '@/components/common';
import { useProducts } from '@/features/products/useProducts';
import type { CartLine } from '@/types';
import { getPrimaryProductImage } from '@/utils/product';

interface CartLineItemProps {
  line: CartLine;
  onUpdateQuantity: (cartLineId: string, quantity: number) => void;
  onRemove: (cartLineId: string) => void;
  isUpdating?: boolean;
  onNavigate?: () => void;
}

export function CartLineItem({
  line,
  onUpdateQuantity,
  onRemove,
  isUpdating = false,
  onNavigate,
}: CartLineItemProps) {
  const { data: catalogProducts } = useProducts();
  const enrichedProduct =
    catalogProducts?.find((p) => p.id === line.product_id) ?? line.product;
  const primaryImage = getPrimaryProductImage(enrichedProduct);
  const lineTotal = line.unit_price * line.quantity;

  return (
    <div className="flex gap-4 py-4">
      <Link
        to={`/products/${line.product_id}`}
        onClick={onNavigate}
        className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
      >
        {primaryImage ? (
          <img
            src={primaryImage.image_url}
            alt={primaryImage.alt_text ?? enrichedProduct?.name ?? 'Product image'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <Package className="h-6 w-6" />
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/products/${line.product_id}`}
              onClick={onNavigate}
              className="line-clamp-1 text-sm font-semibold text-slate-900 hover:text-emerald-700"
            >
              {enrichedProduct?.name ?? 'Product'}
            </Link>
            <p className="mt-0.5 text-xs text-slate-500">
              Unit: <MoneyDisplay amountInCentimes={line.unit_price} />
            </p>
          </div>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onRemove(line.id)}
            aria-label={`Remove ${enrichedProduct?.name ?? 'item'} from cart`}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              disabled={isUpdating || line.quantity <= 1}
              onClick={() => onUpdateQuantity(line.id, line.quantity - 1)}
              aria-label="Decrease quantity"
              className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-8 text-center text-xs font-semibold tabular-nums text-slate-900">
              {line.quantity}
            </span>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdateQuantity(line.id, line.quantity + 1)}
              aria-label="Increase quantity"
              className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <MoneyDisplay
            amountInCentimes={lineTotal}
            className="text-sm font-semibold text-slate-900"
          />
        </div>
      </div>
    </div>
  );
}
