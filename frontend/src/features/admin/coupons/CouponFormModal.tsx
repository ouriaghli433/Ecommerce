import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button, Input, Modal, Select } from '@/components/ui';
import { applyLaravelFieldErrors } from '@/services/http/errorParser';
import type { Coupon } from '@/types';
import { centimesToMajor, majorToCentimes } from '@/utils/money';
import { useCreateCoupon, useUpdateCoupon } from '../useAdminQueries';

const couponSchema = z
  .object({
    code: z.string().trim().min(1, 'Code is required').max(50),
    type: z.enum(['percent', 'fixed']),
    value_input: z.coerce.number().positive('Value must be greater than 0'),
    min_order_major: z.coerce.number().min(0, 'Minimum order must be 0 or greater'),
    max_usage: z.string().optional(),
    per_user_limit: z.string().optional(),
    starts_at: z.string().optional(),
    expires_at: z.string().optional(),
    is_active: z.boolean(),
  })
  .refine(
    (data) => data.type !== 'percent' || (Number.isInteger(data.value_input) && data.value_input <= 100),
    {
      message: 'Percentage value must be a whole number between 1 and 100',
      path: ['value_input'],
    }
  );

type CouponFormValues = z.infer<typeof couponSchema>;

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface CouponFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCoupon?: Coupon | null;
}

export function CouponFormModal({
  isOpen,
  onClose,
  editingCoupon,
}: CouponFormModalProps) {
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '',
      type: 'percent',
      value_input: 10,
      min_order_major: 0,
      max_usage: '',
      per_user_limit: '',
      starts_at: '',
      expires_at: '',
      is_active: true,
    },
  });

  const discountType = watch('type');

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    if (editingCoupon) {
      reset({
        code: editingCoupon.code,
        type: editingCoupon.type,
        value_input:
          editingCoupon.type === 'percent'
            ? editingCoupon.value
            : Number(centimesToMajor(editingCoupon.value)),
        min_order_major: Number(centimesToMajor(editingCoupon.min_order_amount)),
        max_usage: editingCoupon.max_usage ? String(editingCoupon.max_usage) : '',
        per_user_limit: editingCoupon.per_user_limit ? String(editingCoupon.per_user_limit) : '',
        starts_at: toDateTimeLocal(editingCoupon.starts_at),
        expires_at: toDateTimeLocal(editingCoupon.expires_at),
        is_active: editingCoupon.is_active,
      });
    } else {
      reset({
        code: '',
        type: 'percent',
        value_input: 10,
        min_order_major: 0,
        max_usage: '',
        per_user_limit: '',
        starts_at: '',
        expires_at: '',
        is_active: true,
      });
    }
  }, [isOpen, editingCoupon, reset]);

  const isPending = createCoupon.isPending || updateCoupon.isPending;

  const onSubmit = async (values: CouponFormValues) => {
    setServerError(null);
    const payload = {
      code: values.code.trim().toUpperCase(),
      type: values.type,
      value:
        values.type === 'percent'
          ? Math.round(values.value_input)
          : majorToCentimes(values.value_input),
      min_order_amount: majorToCentimes(values.min_order_major),
      max_usage: values.max_usage?.trim() ? Number.parseInt(values.max_usage, 10) : null,
      per_user_limit: values.per_user_limit?.trim()
        ? Number.parseInt(values.per_user_limit, 10)
        : null,
      starts_at: values.starts_at ? new Date(values.starts_at).toISOString() : null,
      expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
      is_active: values.is_active,
    };

    try {
      if (editingCoupon) {
        await updateCoupon.mutateAsync({ id: editingCoupon.id, payload });
      } else {
        await createCoupon.mutateAsync(payload);
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
      size="lg"
      title={editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
      description="Coupon codes are automatically stored in uppercase by the backend."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Coupon code"
            placeholder="SAVE15"
            error={errors.code?.message}
            {...register('code')}
          />
          <Select
            label="Discount type"
            error={errors.type?.message}
            options={[
              { value: 'percent', label: 'Percentage (%)' },
              { value: 'fixed', label: 'Fixed Amount (MAD)' },
            ]}
            {...register('type')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={discountType === 'percent' ? 'Discount percentage (%)' : 'Discount amount (MAD)'}
            type="number"
            step={discountType === 'percent' ? '1' : '0.01'}
            min={discountType === 'percent' ? '1' : '0.01'}
            error={errors.value_input?.message}
            {...register('value_input')}
          />
          <Input
            label="Minimum order subtotal (MAD)"
            type="number"
            step="0.01"
            min="0"
            error={errors.min_order_major?.message}
            {...register('min_order_major')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Max global uses (optional)"
            type="number"
            min="1"
            placeholder="Unlimited"
            error={errors.max_usage?.message}
            {...register('max_usage')}
          />
          <Input
            label="Per-user limit (optional)"
            type="number"
            min="1"
            placeholder="Unlimited"
            error={errors.per_user_limit?.message}
            {...register('per_user_limit')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Starts at (optional)"
            type="datetime-local"
            error={errors.starts_at?.message}
            {...register('starts_at')}
          />
          <Input
            label="Expires at (optional)"
            type="datetime-local"
            error={errors.expires_at?.message}
            {...register('expires_at')}
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            {...register('is_active')}
          />
          <span>Coupon is active</span>
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            {editingCoupon ? 'Save Changes' : 'Create Coupon'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
