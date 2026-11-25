import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Button, Input, Modal, Select } from '@/components/ui';
import { applyLaravelFieldErrors } from '@/services/http/errorParser';
import type { Address } from '@/types';
import { formatMoney } from '@/utils/money';
import { addressSchema, type AddressFormValues } from './schemas';
import { useCreateAddress, useShippingCities, useUpdateAddress } from './useAddresses';

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAddress?: Address | null;
  onSaved?: (address: Address) => void;
}

export function AddressFormModal({
  isOpen,
  onClose,
  editingAddress,
  onSaved,
}: AddressFormModalProps) {
  const citiesQuery = useShippingCities(isOpen);
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const [serverError, setServerError] = useState<string | null>(null);

  const cities = citiesQuery.data ?? [];

  const cityOptions = useMemo(() => {
    const opts = cities.map((c) => ({
      value: c.city,
      label: `${c.city} (${formatMoney(c.cost)} shipping)`,
    }));

    if (
      editingAddress?.city &&
      !cities.some((c) => c.city === editingAddress.city)
    ) {
      opts.unshift({
        value: editingAddress.city,
        label: `${editingAddress.city} (inactive / unsupported)`,
      });
    }

    return opts;
  }, [cities, editingAddress]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      address_line: '',
      city: '',
      postal_code: '',
      country: 'Morocco',
      is_default: false,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    if (editingAddress) {
      reset({
        full_name: editingAddress.full_name,
        phone: editingAddress.phone,
        address_line: editingAddress.address_line,
        city: editingAddress.city,
        postal_code: editingAddress.postal_code ?? '',
        country: editingAddress.country,
        is_default: editingAddress.is_default,
      });
    } else {
      reset({
        full_name: '',
        phone: '',
        address_line: '',
        city: cities[0]?.city ?? '',
        postal_code: '',
        country: 'Morocco',
        is_default: false,
      });
    }
  }, [isOpen, editingAddress, cities, reset]);

  const isPending = createAddress.isPending || updateAddress.isPending;

  const onSubmit = async (values: AddressFormValues) => {
    setServerError(null);
    const payload = {
      ...values,
      postal_code: values.postal_code?.trim() ? values.postal_code.trim() : null,
    };

    try {
      const response = editingAddress
        ? await updateAddress.mutateAsync({ id: editingAddress.id, payload })
        : await createAddress.mutateAsync(payload);
      onSaved?.(response.address);
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
      title={editingAddress ? 'Edit Shipping Address' : 'Add Shipping Address'}
      description="Cities are loaded directly from active database shipping zones to ensure exact rate matching."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        {citiesQuery.isError && (
          <Alert variant="warning">
            Could not load shipping cities from the server. Please retry before saving.
          </Alert>
        )}

        <Input
          label="Full name"
          placeholder="Abdelhamid Ouriaghli"
          error={errors.full_name?.message}
          {...register('full_name')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            placeholder="0612345678"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Select
            label="City"
            disabled={citiesQuery.isLoading || cityOptions.length === 0}
            placeholder={
              citiesQuery.isLoading
                ? 'Loading cities...'
                : cityOptions.length === 0
                  ? 'No active cities configured'
                  : 'Select delivery city'
            }
            options={cityOptions}
            error={errors.city?.message}
            {...register('city')}
          />
        </div>

        <Input
          label="Street address"
          placeholder="Avenue Mohammed V, Apt 12"
          error={errors.address_line?.message}
          {...register('address_line')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Postal code (optional)"
            placeholder="90000"
            error={errors.postal_code?.message}
            {...register('postal_code')}
          />
          <Input
            label="Country"
            placeholder="Morocco"
            error={errors.country?.message}
            {...register('country')}
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-[#2454E8] focus:ring-[#2454E8]"
            {...register('is_default')}
          />
          <span>Set as default shipping address</span>
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="secondary"
            isLoading={isPending}
            disabled={citiesQuery.isLoading || cityOptions.length === 0}
          >
            {editingAddress ? 'Save Changes' : 'Save Address'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
