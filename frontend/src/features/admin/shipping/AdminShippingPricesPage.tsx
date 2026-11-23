import { useState } from 'react';
import { Ban, Pencil, Plus, Truck } from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
import { ErrorState, MoneyDisplay, PageHeader } from '@/components/common';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/components/ui';
import { parseApiError } from '@/services/http/errorParser';
import type { ShippingPrice } from '@/types';
import { useAdminShippingPrices, useDisableShippingPrice } from '../useAdminQueries';
import { ShippingPriceFormModal } from './ShippingPriceFormModal';

export function AdminShippingPricesPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const shippingQuery = useAdminShippingPrices(page);
  const disableShipping = useDisableShippingPrice();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingPrice | null>(null);
  const [disabling, setDisabling] = useState<ShippingPrice | null>(null);

  const paginated = shippingQuery.data;
  const items = paginated?.data ?? [];

  const handleConfirmDisable = async () => {
    if (!disabling) return;
    try {
      await disableShipping.mutateAsync(disabling.id);
      setDisabling(null);
    } catch (error) {
      toast.error('Disable failed', parseApiError(error).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipping Prices"
        description="Configure city-based delivery rates used by checkout preview and order placement."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add City Rate
          </Button>
        }
      />

      {shippingQuery.isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : shippingQuery.isError ? (
        <ErrorState
          title="Could not load shipping prices"
          error={shippingQuery.error}
          onRetry={() => shippingQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-6 w-6" />}
          title="No shipping rates configured"
          description="Add delivery rates by city so customers can complete checkout."
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>City</TableHeader>
                <TableHeader>Cost</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold text-slate-900">{item.city}</TableCell>
                  <TableCell>
                    <MoneyDisplay amountInCentimes={item.cost} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'success' : 'neutral'}>
                      {item.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(item);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {item.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-700 hover:bg-amber-50"
                          onClick={() => setDisabling(item)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {paginated && (
            <Pagination
              currentPage={paginated.current_page}
              lastPage={paginated.last_page}
              total={paginated.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <ShippingPriceFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingItem={editing}
      />

      <ConfirmDialog
        isOpen={Boolean(disabling)}
        onClose={() => setDisabling(null)}
        onConfirm={handleConfirmDisable}
        isLoading={disableShipping.isPending}
        title="Disable Shipping City"
        description={`Disable shipping for "${disabling?.city ?? ''}"? Customers shipping to this city will not be able to place new orders.`}
        confirmLabel="Disable Rate"
      />
    </div>
  );
}
