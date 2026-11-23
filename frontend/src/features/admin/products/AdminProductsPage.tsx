import { useMemo, useState } from 'react';
import { Archive, Image as ImageIcon, Package, Pencil, Plus, Search } from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
import { ErrorState, MoneyDisplay, PageHeader } from '@/components/common';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/components/ui';
import { useCategories, useCategoryMap } from '@/features/categories/useCategories';
import { useProducts } from '@/features/products/useProducts';
import { parseApiError } from '@/services/http/errorParser';
import type { Product } from '@/types';
import { getPrimaryProductImage } from '@/utils/product';
import { useAdminInventory, useArchiveProduct } from '../useAdminQueries';
import { ProductFormModal } from './ProductFormModal';
import { ProductImagesModal } from './ProductImagesModal';

const PAGE_SIZE = 10;

export function AdminProductsPage() {
  const toast = useToast();
  const productsQuery = useProducts();
  const inventoryQuery = useAdminInventory();
  const categoriesQuery = useCategories();
  const categoryMap = useCategoryMap();
  const archiveProduct = useArchiveProduct();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagesProduct, setImagesProduct] = useState<Product | null>(null);
  const [archivingProduct, setArchivingProduct] = useState<Product | null>(null);

  // Merge active products (with images) and inventory.product (includes archived products)
  const mergedProducts = useMemo(() => {
    const map = new Map<string, Product>();

    for (const inv of inventoryQuery.data ?? []) {
      if (inv.product) {
        map.set(inv.product.id, { ...inv.product, inventory: inv });
      }
    }

    for (const prod of productsQuery.data ?? []) {
      const existing = map.get(prod.id);
      map.set(prod.id, {
        ...prod,
        inventory: existing?.inventory,
      });
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [productsQuery.data, inventoryQuery.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mergedProducts.filter((p) => {
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'archived' && p.is_active) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
      );
    });
  }, [mergedProducts, search, statusFilter]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, lastPage);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleConfirmArchive = async () => {
    if (!archivingProduct) return;
    try {
      await archiveProduct.mutateAsync(archivingProduct.id);
      setArchivingProduct(null);
    } catch (error) {
      toast.error('Archive failed', parseApiError(error).message);
    }
  };

  const isLoading = productsQuery.isLoading || inventoryQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage catalog items, pricing (MAD), attributes, and product images."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingProduct(null);
              setFormOpen(true);
            }}
          >
            Create Product
          </Button>
        }
      />

      <Alert variant="info">
        Archived products (<code>is_active: false</code>) are excluded by the public <code>GET /api/product</code> endpoint,
        so this view cross-references <code>GET /api/inventory</code> to keep archived items visible and reactivable.
      </Alert>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, SKU, slug..."
            leftElement={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            aria-label="Filter product status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | 'active' | 'archived');
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active only' },
              { value: 'archived', label: 'Archived only' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : productsQuery.isError && inventoryQuery.isError ? (
        <ErrorState
          title="Could not load products"
          error={productsQuery.error}
          onRetry={() => {
            productsQuery.refetch();
            inventoryQuery.refetch();
          }}
        />
      ) : paginated.length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="No products found"
          description="Create a product or adjust your search filter."
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Product</TableHeader>
                <TableHeader>SKU</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Price</TableHeader>
                <TableHeader>Stock</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((product) => {
                const img = getPrimaryProductImage(product);
                const cat = categoryMap.get(product.category_id);
                const available = product.inventory
                  ? product.inventory.on_hand - product.inventory.reserved
                  : null;
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {img ? (
                            <img
                              src={img.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-400">{product.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                    <TableCell>{cat?.name ?? '—'}</TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      <MoneyDisplay amountInCentimes={product.price} />
                    </TableCell>
                    <TableCell className="tabular-nums text-xs">
                      {available !== null ? (
                        <span>
                          {available} avail ({product.inventory?.on_hand} on hand)
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'success' : 'neutral'}>
                        {product.is_active ? 'Active' : 'Archived'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Manage Images"
                          onClick={() => setImagesProduct(product)}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit Product"
                          onClick={() => {
                            setEditingProduct(product);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {product.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Archive Product"
                            className="text-amber-700 hover:bg-amber-50"
                            onClick={() => setArchivingProduct(product)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Pagination
            currentPage={safePage}
            lastPage={lastPage}
            total={filtered.length}
            onPageChange={setPage}
          />
        </>
      )}

      <ProductFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        categories={categoriesQuery.data ?? []}
        editingProduct={editingProduct}
      />

      <ProductImagesModal
        product={imagesProduct}
        onClose={() => setImagesProduct(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(archivingProduct)}
        onClose={() => setArchivingProduct(null)}
        onConfirm={handleConfirmArchive}
        isLoading={archiveProduct.isPending}
        title="Archive Product"
        description={`Archiving "${archivingProduct?.name ?? ''}" sets is_active to false so customers can no longer purchase it.`}
        confirmLabel="Archive Product"
      />
    </div>
  );
}
