import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button, Input, Modal } from '@/components/ui';
import { applyLaravelFieldErrors } from '@/services/http/errorParser';
import type { ShippingPrice } from '@/types';
import { centimesToMajor, majorToCentimes } from '@/utils/money';
import { useCreateShippingPrice, useUpdateShippingPrice } from '../useAdminQueries';

const shippingSchema = z.object({
  city: z.string().trim().min(1, 'City is required').max(255),
  cost_major: z.coerce.number().min(0, 'Shipping cost cannot be negative'),
  is_active: z.boolean(),
});

type ShippingFormValues = z.infer<typeof shippingSchema>;

interface ShippingPriceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: ShippingPrice | null;
}

export function ShippingPriceFormModal({
  isOpen,
  onClose,
  editingItem,
}: ShippingPriceFormModalProps) {
  const createShipping = useCreateShippingPrice();
  const updateShipping = useUpdateShippingPrice();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: { city: '', cost_major: 30, is_active: true },
  });

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    if (editingItem) {
      reset({
        city: editingItem.city,
        cost_major: Number(centimesToMajor(editingItem.cost)),
        is_active: editingItem.is_active,
      });
    } else {
      reset({ city: '', cost_major: 30, is_active: true });
    }
  }, [isOpen, editingItem, reset]);

  const isPending = createShipping.isPending || updateShipping.isPending;

  const onSubmit = async (values: ShippingFormValues) => {
    setServerError(null);
    const payload = {
      city: values.city,
      cost: majorToCentimes(values.cost_major),
      is_active: values.is_active,
    };

    try {
      if (editingItem) {
        await updateShipping.mutateAsync({ id: editingItem.id, payload });
      } else {
        await createShipping.mutateAsync(payload);
      }
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
      title={editingItem ? 'Edit Shipping Price' : 'Add City Shipping Price'}
      description="Checkout matches the customer address city exactly against active shipping prices."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <Input
          label="City"
          placeholder="Tangier"
          error={errors.city?.message}
          {...register('city')}
        />

        <Input
          label="Shipping cost (MAD)"
          type="number"
          step="0.01"
          min="0"
          error={errors.cost_major?.message}
          {...register('cost_major')}
        />

        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            {...register('is_active')}
          />
          <span>Active for checkout</span>
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            {editingItem ? 'Save Changes' : 'Save City Price'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
