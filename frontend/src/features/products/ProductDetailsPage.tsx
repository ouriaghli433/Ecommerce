import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Minus, Package, Plus, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, MoneyDisplay } from '@/components/common';
import { Alert, Badge, Button, Skeleton } from '@/components/ui';
import { useAddToCart } from '@/features/cart/useCart';
import { useCategoryMap } from '@/features/categories/useCategories';
import { parseApiError } from '@/services/http/errorParser';
import { cn } from '@/utils/cn';
import { getSortedProductImages, parseProductAttributes } from '@/utils/product';
import { ProductCard } from './ProductCard';
import { useProduct, useProducts } from './useProducts';

export function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const productQuery = useProduct(id);
  const allProductsQuery = useProducts();
  const categoryMap = useCategoryMap();
  const addToCart = useAddToCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  const product = productQuery.data;
  const images = useMemo(() => getSortedProductImages(product), [product]);
  const attributes = useMemo(
    () => parseProductAttributes(product?.attributes ?? null),
    [product?.attributes]
  );
  const category = product ? categoryMap.get(product.category_id) : undefined;

  useEffect(() => {
    setQuantity(1);
    setCartError(null);
    setSelectedImageId(images[0]?.id ?? null);
  }, [id, images]);

  const activeImage = images.find((img) => img.id === selectedImageId) ?? images[0] ?? null;

  const relatedProducts = useMemo(() => {
    if (!product || !allProductsQuery.data) return [];
    return allProductsQuery.data
      .filter((p) => p.category_id === product.category_id && p.id !== product.id)
      .slice(0, 4);
  }, [product, allProductsQuery.data]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!Number.isInteger(quantity) || quantity < 1) {
      setCartError('Please enter a valid quantity of at least 1.');
      return;
    }
    setCartError(null);
    try {
      await addToCart.mutateAsync({ product_id: product.id, quantity });
    } catch (error) {
      setCartError(parseApiError(error).message);
    }
  };

  if (productQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (productQuery.isError) {
    const parsed = parseApiError(productQuery.error);
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <ErrorState
          title={parsed.isNotFound ? 'Product not found' : 'Unable to load product'}
          message={
            parsed.isNotFound
              ? 'This product may have been archived or does not exist.'
              : parsed.message
          }
          onRetry={parsed.isNotFound ? undefined : () => productQuery.refetch()}
        />
        <div className="mt-6 text-center">
          <Link to="/products">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/" className="hover:text-slate-900">
          Home
        </Link>
        <span>/</span>
        <Link to="/products" className="hover:text-slate-900">
          Products
        </Link>
        {category && (
          <>
            <span>/</span>
            <Link to={`/products?category=${category.id}`} className="hover:text-slate-900">
              {category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="truncate font-medium text-slate-900">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Image Gallery */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[26px] bg-[#F4F5F7] p-8">
            {activeImage ? (
              <img
                src={activeImage.image_url}
                alt={activeImage.alt_text ?? product.name}
                className="max-h-full max-w-full object-contain mix-blend-multiply"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                <Package className="h-16 w-16" />
                <span className="mt-2 text-sm">No product image provided</span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImageId(img.id)}
                  className={cn(
                    'flex aspect-square items-center justify-center overflow-hidden rounded-2xl border bg-[#F4F5F7] p-2 transition-all',
                    activeImage?.id === img.id
                      ? 'border-[#2454E8] ring-2 ring-[#2454E8]/25'
                      : 'border-transparent opacity-75 hover:opacity-100'
                  )}
                >
                  <img
                    src={img.image_url}
                    alt={img.alt_text ?? product.name}
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6 lg:col-span-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {category && <Badge variant="info">{category.name}</Badge>}
              <Badge variant={product.is_active ? 'success' : 'neutral'}>
                {product.is_active ? 'Available' : 'Unavailable'}
              </Badge>
              <span className="text-xs font-medium tracking-wider uppercase text-slate-400">
                SKU: {product.sku}
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{product.name}</h1>

            <MoneyDisplay
              amountInCentimes={product.price}
              className="block text-2xl font-extrabold text-slate-900"
            />
          </div>

          {product.description && (
            <p className="leading-relaxed text-slate-600">{product.description}</p>
          )}

          {attributes && Object.keys(attributes).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Specifications
              </h2>
              <dl className="divide-y divide-slate-100 text-sm">
                {Object.entries(attributes).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <dt className="capitalize text-slate-500">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium text-slate-900">{String(val ?? '—')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {cartError && (
            <Alert variant="error" title="Cart notice">
              {cartError}
            </Alert>
          )}

          <div className="space-y-3 border-t border-slate-200 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-full w-11 items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10);
                    setQuantity(Number.isNaN(parsed) ? 1 : Math.max(1, parsed));
                  }}
                  aria-label="Quantity"
                  className="w-14 text-center text-sm font-semibold tabular-nums text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-full w-11 items-center justify-center text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                size="lg"
                variant="secondary"
                className="flex-1"
                disabled={!product.is_active}
                isLoading={addToCart.isPending}
                onClick={handleAddToCart}
                leftIcon={<ShoppingBag className="h-4 w-4" />}
              >
                Add to Cart
              </Button>
            </div>

            <p className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Live inventory availability is verified by the backend when adding to bag and at checkout.
            </p>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6 border-t border-slate-200 pt-10">
          <h2 className="text-xl font-bold text-slate-900">Related Products</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((related) => (
              <ProductCard
                key={related.id}
                product={related}
                category={categoryMap.get(related.category_id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
