import { useMemo } from 'react';
import {
  ArrowRight,
  Headphones,
  Package,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/common';
import { Button, EmptyState, ProductCardSkeleton, Skeleton } from '@/components/ui';
import { useActiveCategories, useCategoryMap } from '@/features/categories/useCategories';
import type { Category, Product } from '@/types';
import { getPrimaryProductImage } from '@/utils/product';
import { ProductCard } from './ProductCard';
import { useProducts } from './useProducts';

function findCategoryBySlugOrName(categories: Category[], slug: string): Category | undefined {
  return categories.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
}

function pickCategoryShowcaseProduct(
  products: Product[],
  categoryId: string | undefined,
  preferredSku?: string
): Product | undefined {
  if (!categoryId) return undefined;
  const inCat = products.filter((p) => p.category_id === categoryId);
  if (preferredSku) {
    const match = inCat.find((p) => p.sku === preferredSku);
    if (match) return match;
  }
  return inCat.find((p) => (p.images?.length ?? 0) > 0) ?? inCat[0];
}

export function HomePage() {
  const productsQuery = useProducts();
  const categoriesQuery = useActiveCategories();
  const categoryMap = useCategoryMap();

  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  // Hero showcase items
  const heroPrimaryProduct =
    products.find((p) => p.sku === 'APL-IP16PM-256') ??
    products.find((p) => (p.images?.length ?? 0) > 0) ??
    products[0];
  const heroSecondaryProduct = products.find((p) => p.sku === 'APL-APP2-USBC');
  const heroPrimaryImg = getPrimaryProductImage(heroPrimaryProduct);
  const heroSecondaryImg = getPrimaryProductImage(heroSecondaryProduct);

  // 4-Card Bento Category Picks (matching reference mosaic)
  const iphoneCat = findCategoryBySlugOrName(categories, 'iphone') ?? categories[0];
  const macCat = findCategoryBySlugOrName(categories, 'mac') ?? categories[1];
  const audioCat = findCategoryBySlugOrName(categories, 'airpods-audio') ?? categories[2];
  const accCat = findCategoryBySlugOrName(categories, 'accessoires') ?? categories[3];

  const bentoIds = new Set(
    [iphoneCat?.id, macCat?.id, audioCat?.id, accCat?.id].filter(Boolean)
  );
  const secondaryCategories = categories.filter((c) => !bentoIds.has(c.id));

  const iphonePreview = getPrimaryProductImage(
    pickCategoryShowcaseProduct(products, iphoneCat?.id, 'APL-IP16-128')
  );
  const macPreview = getPrimaryProductImage(
    pickCategoryShowcaseProduct(products, macCat?.id, 'APL-MBA13-M3')
  );
  const audioPreview = getPrimaryProductImage(
    pickCategoryShowcaseProduct(products, audioCat?.id, 'APL-APM-USBC')
  );
  const accPreview = getPrimaryProductImage(
    pickCategoryShowcaseProduct(products, accCat?.id, 'APL-MAGSAFE')
  );

  // Popular right now: curate across diverse categories so the 4-card strip pops visually
  const popularProducts = useMemo(() => {
    const preferredSkus = [
      'APL-IP16-128',
      'APL-MBA13-M3',
      'APL-APP2-USBC',
      'APL-AWS10-46',
    ];
    const picked: Product[] = [];
    for (const sku of preferredSkus) {
      const found = products.find((p) => p.sku === sku);
      if (found) picked.push(found);
    }
    for (const prod of products) {
      if (picked.length >= 4) break;
      if (!picked.some((x) => x.id === prod.id)) {
        picked.push(prod);
      }
    }
    return picked.slice(0, 4);
  }, [products]);

  // Newest / remaining arrivals (exclude popular ones if we have plenty)
  const latestProducts = useMemo(() => {
    const popularIds = new Set(popularProducts.map((p) => p.id));
    const sorted = [...products].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const nonDuplicate = sorted.filter((p) => !popularIds.has(p.id));
    return (nonDuplicate.length >= 4 ? nonDuplicate : sorted).slice(0, 8);
  }, [products, popularProducts]);

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 pt-6 pb-16 sm:px-6 lg:px-8">
      {/* Hero Vitrine Card */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#F4F5F7] px-6 py-12 sm:px-12 lg:px-14 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="relative z-10 space-y-6 lg:col-span-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.06]">
              Closer to the future.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-slate-500 sm:text-lg">
              Apple, Samsung, and everyday digital essentials — with live stock reservation and city-exact delivery.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link to="/products">
                <Button variant="secondary" size="lg" pill>
                  Browse Catalog
                </Button>
              </Link>
              <Link to="/products?sort=latest">
                <Button variant="outline" size="lg" pill className="border-slate-300 bg-white">
                  New Arrivals
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative flex min-h-[270px] items-center justify-center lg:col-span-6 lg:min-h-[340px]">
            {productsQuery.isLoading ? (
              <Skeleton className="h-72 w-full rounded-2xl" />
            ) : heroPrimaryProduct && heroPrimaryImg ? (
              <Link
                to={`/products/${heroPrimaryProduct.id}`}
                className="group relative flex w-full items-center justify-center"
              >
                {heroSecondaryImg && (
                  <img
                    src={heroSecondaryImg.image_url}
                    alt={heroSecondaryProduct?.name ?? 'AirPods Pro'}
                    className="pointer-events-none absolute -top-2 left-4 hidden h-28 w-28 object-contain mix-blend-multiply opacity-90 transition-transform duration-500 group-hover:-translate-y-1 sm:block lg:left-8 lg:h-36 lg:w-36"
                  />
                )}
                <img
                  src={heroPrimaryImg.image_url}
                  alt={heroPrimaryImg.alt_text ?? heroPrimaryProduct.name}
                  className="max-h-72 w-auto object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 lg:max-h-88"
                />
                <span className="absolute right-0 bottom-1 hidden items-center gap-2 text-xs font-medium text-slate-400 sm:inline-flex">
                  <span className="h-px w-8 bg-slate-300" />
                  {heroPrimaryProduct.name}
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* Bento Category Grid ("Find yours") */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Find yours
          </h2>
          <Link
            to="/products"
            className="text-sm font-semibold text-[#2454E8] hover:text-[#1D46C7]"
          >
            All categories &rarr;
          </Link>
        </div>

        {categoriesQuery.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <Skeleton className="h-80 rounded-[24px] lg:col-span-4" />
            <Skeleton className="h-80 rounded-[24px] lg:col-span-4" />
            <Skeleton className="h-80 rounded-[24px] lg:col-span-4" />
          </div>
        ) : categoriesQuery.isError ? (
          <ErrorState
            title="Could not load categories"
            error={categoriesQuery.error}
            onRetry={() => categoriesQuery.refetch()}
          />
        ) : categories.length === 0 ? (
          <EmptyState
            title="No active categories"
            description="Categories created by an administrator will appear here."
          />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-12">
              {/* Featured Cobalt Blue Tall Card */}
              {iphoneCat && (
                <Link
                  to={`/products?category=${iphoneCat.id}`}
                  className="group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[24px] bg-gradient-to-br from-[#2454E8] to-[#3B6AF5] p-6 text-white transition-transform duration-200 hover:-translate-y-0.5 lg:col-span-4 lg:min-h-[340px]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{iphoneCat.name}</h3>
                      <p className="text-xs text-white/75">
                        {categoryCounts.get(iphoneCat.id) ?? 0} models
                      </p>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2454E8] transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-4 flex flex-1 items-end justify-center overflow-hidden">
                    {iphonePreview ? (
                      <img
                        src={iphonePreview.image_url}
                        alt={iphoneCat.name}
                        className="max-h-56 w-auto object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Package className="h-16 w-16 text-white/50" />
                    )}
                  </div>
                </Link>
              )}

              {/* Middle Soft-Gray Tall Card */}
              {macCat && (
                <Link
                  to={`/products?category=${macCat.id}`}
                  className="group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[24px] bg-[#F4F5F7] p-6 transition-colors duration-200 hover:bg-[#ECEEF2] lg:col-span-4 lg:min-h-[340px]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{macCat.name}</h3>
                      <p className="text-xs text-slate-500">
                        {categoryCounts.get(macCat.id) ?? 0} models
                      </p>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900 shadow-xs transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-4 flex flex-1 items-center justify-center overflow-hidden">
                    {macPreview ? (
                      <img
                        src={macPreview.image_url}
                        alt={macCat.name}
                        className="max-h-52 w-auto object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Package className="h-16 w-16 text-slate-300" />
                    )}
                  </div>
                </Link>
              )}

              {/* Right Stacked 2 Cards */}
              <div className="grid gap-4 lg:col-span-4">
                {audioCat && (
                  <Link
                    to={`/products?category=${audioCat.id}`}
                    className="group flex items-center justify-between gap-4 overflow-hidden rounded-[24px] bg-[#F4F5F7] p-6 transition-colors duration-200 hover:bg-[#ECEEF2]"
                  >
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">{audioCat.name}</h3>
                      <p className="text-xs text-slate-500">
                        {categoryCounts.get(audioCat.id) ?? 0} items
                      </p>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-900 shadow-xs transition-transform group-hover:translate-x-0.5 mt-2">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    {audioPreview && (
                      <img
                        src={audioPreview.image_url}
                        alt={audioCat.name}
                        className="h-28 w-28 shrink-0 object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </Link>
                )}

                {accCat && (
                  <Link
                    to={`/products?category=${accCat.id}`}
                    className="group flex items-center justify-between gap-4 overflow-hidden rounded-[24px] bg-[#F4F5F7] p-6 transition-colors duration-200 hover:bg-[#ECEEF2]"
                  >
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">{accCat.name}</h3>
                      <p className="text-xs text-slate-500">
                        {categoryCounts.get(accCat.id) ?? 0} items
                      </p>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-900 shadow-xs transition-transform group-hover:translate-x-0.5 mt-2">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    {accPreview && (
                      <img
                        src={accPreview.image_url}
                        alt={accCat.name}
                        className="h-28 w-28 shrink-0 object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </Link>
                )}
              </div>
            </div>

            {/* Remaining active categories (iPad, Apple Watch, Samsung, etc.) */}
            {secondaryCategories.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                {secondaryCategories.map((cat) => {
                  const preview = getPrimaryProductImage(
                    pickCategoryShowcaseProduct(products, cat.id)
                  );
                  return (
                    <Link
                      key={cat.id}
                      to={`/products?category=${cat.id}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl bg-[#F4F5F7] px-5 py-4 transition-colors hover:bg-[#ECEEF2]"
                    >
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900 group-hover:text-[#2454E8]">
                          {cat.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {categoryCounts.get(cat.id) ?? 0} products
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {preview && (
                          <img
                            src={preview.image_url}
                            alt={cat.name}
                            className="h-12 w-12 object-contain mix-blend-multiply"
                          />
                        )}
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-xs">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* Popular Right Now */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Popular right now
          </h2>
          <Link
            to="/products"
            className="text-sm font-semibold text-[#2454E8] hover:text-[#1D46C7]"
          >
            View all &rarr;
          </Link>
        </div>

        {productsQuery.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : productsQuery.isError ? (
          <ErrorState
            title="Could not load products"
            error={productsQuery.error}
            onRetry={() => productsQuery.refetch()}
          />
        ) : popularProducts.length === 0 ? (
          <EmptyState
            title="No products available"
            description="Products published by administrators will appear here."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {popularProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                category={categoryMap.get(product.category_id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Latest Arrivals & Accessories */}
      {latestProducts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Latest arrivals
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Fresh additions across iPad, Mac, Samsung, and MagSafe accessories.
              </p>
            </div>
            <Link
              to="/products?sort=latest"
              className="text-sm font-semibold text-[#2454E8] hover:text-[#1D46C7]"
            >
              See catalog ({products.length}) &rarr;
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {latestProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                category={categoryMap.get(product.category_id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Service & Trust Banner (Matching Reference Bottom Card) */}
      <section className="rounded-[28px] bg-[#F4F5F7] p-7 sm:p-10">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-200/80 pb-8 md:flex-row md:items-center">
          <h2 className="max-w-lg text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Great tech. Calm &amp; effortless shopping.
          </h2>
          <Link to="/products">
            <Button variant="secondary" size="lg" pill>
              Explore Full Catalog
            </Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[#2454E8]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Verified stock locks</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Inventory is reserved atomically for 30 minutes at order placement.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[#2454E8]">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">City-matched shipping</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Address cities load directly from active delivery zones across Morocco.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[#2454E8]">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Stripe Checkout</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Idempotent session creation with webhook-verified order confirmation.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-900">Need order tracking?</p>
              <Link to="/account/orders" className="text-xs font-medium text-[#2454E8] hover:underline">
                View my orders &rarr;
              </Link>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2454E8]/10 text-[#2454E8]">
              <Headphones className="h-4 w-4" />
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
