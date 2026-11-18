import { Loader2, Package, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MoneyDisplay } from '@/components/common';
import { useAddToCart } from '@/features/cart/useCart';
import type { Category, Product } from '@/types';
import { getPrimaryProductImage } from '@/utils/product';

interface ProductCardProps {
  product: Product;
  category?: Category;
}

export function ProductCard({ product, category }: ProductCardProps) {
  const addToCart = useAddToCart();
  const primaryImage = getPrimaryProductImage(product);
  const isAdding =
    addToCart.isPending && addToCart.variables?.product_id === product.id;

  return (
    <article className="group flex flex-col justify-between rounded-[22px] bg-[#F4F5F7] p-5 transition-all duration-200 hover:bg-[#ECEEF2]">
      {/* Top Title + Circular Quick-Add */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/products/${product.id}`}
            className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 transition-colors hover:text-[#2454E8]"
          >
            {product.name}
          </Link>
          {category && (
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              {category.name}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={isAdding}
          aria-label={`Add ${product.name} to cart`}
          title="Add to cart"
          onClick={() => addToCart.mutate({ product_id: product.id, quantity: 1 })}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 shadow-xs transition-all hover:bg-[#2454E8] hover:text-white disabled:opacity-60"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Centered Studio Image */}
      <Link
        to={`/products/${product.id}`}
        className="my-4 flex h-44 items-center justify-center overflow-hidden rounded-xl"
      >
        {primaryImage ? (
          <img
            src={primaryImage.image_url}
            alt={primaryImage.alt_text ?? product.name}
            loading="lazy"
            className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Package className="h-12 w-12" />
          </div>
        )}
      </Link>

      {/* Bottom Price */}
      <div className="flex items-baseline justify-between gap-2 pt-1">
        <MoneyDisplay
          amountInCentimes={product.price}
          className="text-base font-bold text-slate-900"
        />
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
          {product.sku}
        </span>
      </div>
    </article>
  );
}
