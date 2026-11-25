import { useState } from 'react';
import { Ban, Pencil, Plus, Tag } from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
import { ErrorState, MoneyDisplay, PageHeader } from '@/components/common';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/components/ui';
import { parseApiError } from '@/services/http/errorParser';
import type { Coupon } from '@/types';
import { formatDate } from '@/utils/format';
import { useAdminCoupons, useDisableCoupon } from '../useAdminQueries';
import { CouponFormModal } from './CouponFormModal';

export function AdminCouponsPage() {
  const toast = useToast();
  const couponsQuery = useAdminCoupons();
  const disableCoupon = useDisableCoupon();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [disabling, setDisabling] = useState<Coupon | null>(null);

  const coupons = couponsQuery.data ?? [];

  const handleConfirmDisable = async () => {
    if (!disabling) return;
    try {
      await disableCoupon.mutateAsync(disabling.id);
      setDisabling(null);
    } catch (error) {
      toast.error('Disable failed', parseApiError(error).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description="Manage promotional discount codes, minimum thresholds, and usage windows."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Create Coupon
          </Button>
        }
      />

      {couponsQuery.isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : couponsQuery.isError ? (
        <ErrorState
          title="Could not load coupons"
          error={couponsQuery.error}
          onRetry={() => couponsQuery.refetch()}
        />
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-6 w-6" />}
          title="No coupons created"
          description="Create your first promotional coupon code."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Code</TableHeader>
              <TableHeader>Discount</TableHeader>
              <TableHeader>Min Order</TableHeader>
              <TableHeader>Limits</TableHeader>
              <TableHeader>Validity</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader className="text-right">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell className="font-mono font-bold text-slate-900">
                  {coupon.code}
                </TableCell>
                <TableCell>
                  {coupon.type === 'percent' ? (
                    <span>{coupon.value}% off</span>
                  ) : (
                    <MoneyDisplay amountInCentimes={coupon.value} />
                  )}
                </TableCell>
                <TableCell>
                  <MoneyDisplay amountInCentimes={coupon.min_order_amount} />
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  Global: {coupon.max_usage ?? '∞'} &middot; User: {coupon.per_user_limit ?? '∞'}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {coupon.starts_at ? formatDate(coupon.starts_at) : 'Anytime'} &rarr;{' '}
                  {coupon.expires_at ? formatDate(coupon.expires_at) : 'No expiry'}
                </TableCell>
                <TableCell>
                  <Badge variant={coupon.is_active ? 'success' : 'neutral'}>
                    {coupon.is_active ? 'Active' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(coupon);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {coupon.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-700 hover:bg-amber-50"
                        onClick={() => setDisabling(coupon)}
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
      )}

      <CouponFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingCoupon={editing}
      />

      <ConfirmDialog
        isOpen={Boolean(disabling)}
        onClose={() => setDisabling(null)}
        onConfirm={handleConfirmDisable}
        isLoading={disableCoupon.isPending}
        title="Disable Coupon"
        description={`Disable coupon "${disabling?.code ?? ''}"? Customers will no longer be able to apply it at checkout.`}
        confirmLabel="Disable Coupon"
      />
    </div>
  );
}
