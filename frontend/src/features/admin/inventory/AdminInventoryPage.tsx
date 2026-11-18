import { useMemo, useState } from 'react';
import { ArrowUpDown, Boxes, Plus } from 'lucide-react';
import { ErrorState, PageHeader } from '@/components/common';
import {
  Badge,
  Button,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/components/ui';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';
import { useAdminInventory, useAdminInventoryMovements } from '../useAdminQueries';
import { InventoryMovementModal } from './InventoryMovementModal';

export function AdminInventoryPage() {
  const inventoryQuery = useAdminInventory();
  const movementsQuery = useAdminInventoryMovements();

  const [tab, setTab] = useState<'stock' | 'movements'>('stock');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);

  const inventories = inventoryQuery.data ?? [];
  const movements = useMemo(
    () =>
      [...(movementsQuery.data ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [movementsQuery.data]
  );

  const productNameByInventoryId = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of inventories) {
      if (inv.product?.name) {
        map.set(inv.id, inv.product.name);
      }
    }
    return map;
  }, [inventories]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Stock Ledger"
        description="Track on-hand, reserved, and available quantities and record manual stock movements."
        actions={
          <Button
            variant="primary"
            disabled={inventories.length === 0}
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setSelectedInventoryId(null);
              setModalOpen(true);
            }}
          >
            Record Movement
          </Button>
        }
      />

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('stock')}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'stock' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
          )}
        >
          Stock Levels ({inventories.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('movements')}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'movements'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          Movement Ledger ({movements.length})
        </button>
      </div>

      {tab === 'stock' ? (
        inventoryQuery.isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : inventoryQuery.isError ? (
          <ErrorState
            title="Could not load inventory"
            error={inventoryQuery.error}
            onRetry={() => inventoryQuery.refetch()}
          />
        ) : inventories.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-6 w-6" />}
            title="No inventory records"
            description="Create a product first to initialize its inventory record."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Product</TableHeader>
                <TableHeader>SKU</TableHeader>
                <TableHeader className="text-right">On Hand</TableHeader>
                <TableHeader className="text-right">Reserved</TableHeader>
                <TableHeader className="text-right">Available</TableHeader>
                <TableHeader className="text-right">Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventories.map((inv) => {
                const available = inv.on_hand - inv.reserved;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-semibold text-slate-900">
                      {inv.product?.name ?? inv.product_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {inv.product?.sku ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{inv.on_hand}</TableCell>
                    <TableCell className="text-right tabular-nums">{inv.reserved}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={available <= 0 ? 'danger' : available <= 5 ? 'warning' : 'success'}
                      >
                        {available}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<ArrowUpDown className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setSelectedInventoryId(inv.id);
                          setModalOpen(true);
                        }}
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )
      ) : movementsQuery.isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : movementsQuery.isError ? (
        <ErrorState
          title="Could not load inventory movements"
          error={movementsQuery.error}
          onRetry={() => movementsQuery.refetch()}
        />
      ) : movements.length === 0 ? (
        <EmptyState
          title="No inventory movements recorded"
          description="Stock purchases, reservations, sales, and adjustments will appear here."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Date</TableHeader>
              <TableHeader>Product</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader className="text-right">Quantity</TableHeader>
              <TableHeader>Reason / Reference</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.map((mov) => (
              <TableRow key={mov.id}>
                <TableCell className="text-xs text-slate-500">
                  {formatDateTime(mov.created_at)}
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {productNameByInventoryId.get(mov.inventory_id) ??
                    mov.inventory?.product_id?.slice(0, 8) ??
                    mov.inventory_id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <Badge variant="neutral" className="capitalize">
                    {mov.movement_type}
                  </Badge>
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-semibold tabular-nums',
                    mov.quantity >= 0 ? 'text-emerald-700' : 'text-red-600'
                  )}
                >
                  {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {mov.reason ?? '—'}
                  {mov.reference_type && (
                    <span className="ml-1.5 text-slate-400">
                      ({mov.reference_type} #{mov.reference_id?.slice(0, 8)})
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <InventoryMovementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        inventories={inventories}
        preselectedInventoryId={selectedInventoryId}
      />
    </div>
  );
}
