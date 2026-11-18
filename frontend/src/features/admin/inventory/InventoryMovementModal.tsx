import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { applyLaravelFieldErrors } from '@/services/http/errorParser';
import type { Inventory, ManualInventoryMovementType } from '@/types';
import { useCreateInventoryMovement } from '../useAdminQueries';

const movementSchema = z
  .object({
    inventory_id: z.string().uuid('Select an inventory item'),
    type: z.enum(['purchase', 'return', 'damage', 'adjustment']),
    quantity: z.coerce.number().int().min(1, 'Quantity must be greater than zero'),
    reason: z.string().trim().optional().nullable(),
  })
  .refine((data) => data.type !== 'adjustment' || Boolean(data.reason && data.reason.trim()), {
    message: 'Reason is required for adjustment movements',
    path: ['reason'],
  });

type MovementFormValues = z.infer<typeof movementSchema>;

interface InventoryMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventories: Inventory[];
  preselectedInventoryId?: string | null;
}

export function InventoryMovementModal({
  isOpen,
  onClose,
  inventories,
  preselectedInventoryId,
}: InventoryMovementModalProps) {
  const createMovement = useCreateInventoryMovement();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      inventory_id: '',
      type: 'purchase',
      quantity: 1,
      reason: '',
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    reset({
      inventory_id: preselectedInventoryId ?? inventories[0]?.id ?? '',
      type: 'purchase',
      quantity: 1,
      reason: '',
    });
  }, [isOpen, preselectedInventoryId, inventories, reset]);

  const onSubmit = async (values: MovementFormValues) => {
    setServerError(null);
    try {
      await createMovement.mutateAsync({
        inventory_id: values.inventory_id,
        type: values.type as ManualInventoryMovementType,
        quantity: values.quantity,
        reason: values.reason?.trim() ? values.reason.trim() : null,
      });
      onClose();
    } catch (error) {
      const parsed = applyLaravelFieldErrors(error, setError);
      setServerError(parsed.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Inventory Movement"
      description="Ledger movements atomically update on-hand stock under row-level locks."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <Alert variant="info">
          Backend <code>InventoryService</code> requires positive quantities (&gt; 0). Use{' '}
          <strong>damage</strong> to decrease available stock or <strong>purchase</strong> /{' '}
          <strong>return</strong> / <strong>adjustment</strong> to add stock.
        </Alert>

        <Select
          label="Product Inventory"
          error={errors.inventory_id?.message}
          options={inventories.map((inv) => ({
            value: inv.id,
            label: `${inv.product?.name ?? inv.product_id.slice(0, 8)} (On hand: ${inv.on_hand}, Avail: ${inv.on_hand - inv.reserved})`,
          }))}
          {...register('inventory_id')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Movement type"
            error={errors.type?.message}
            options={[
              { value: 'purchase', label: 'Purchase (+ stock)' },
              { value: 'return', label: 'Return (+ stock)' },
              { value: 'damage', label: 'Damage (- stock)' },
              { value: 'adjustment', label: 'Adjustment (+ stock, reason required)' },
            ]}
            {...register('type')}
          />

          <Input
            label="Quantity"
            type="number"
            min={1}
            error={errors.quantity?.message}
            {...register('quantity')}
          />
        </div>

        <Textarea
          label={selectedType === 'adjustment' ? 'Reason (required)' : 'Reason (optional)'}
          placeholder="e.g. Initial warehouse restock"
          error={errors.reason?.message}
          {...register('reason')}
        />

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={createMovement.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={createMovement.isPending}>
            Record Movement
          </Button>
        </div>
      </form>
    </Modal>
  );
}
