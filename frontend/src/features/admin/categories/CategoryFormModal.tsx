import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button, Input, Modal, Textarea } from '@/components/ui';
import { applyLaravelFieldErrors } from '@/services/http/errorParser';
import type { Category } from '@/types';
import { slugify } from '@/utils/format';
import { useCreateCategory, useUpdateCategory } from '../useAdminQueries';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50),
  slug: z.string().trim().min(1, 'Slug is required').max(500),
  description: z.string().optional().nullable(),
  is_active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory?: Category | null;
}

export function CategoryFormModal({
  isOpen,
  onClose,
  editingCategory,
}: CategoryFormModalProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      is_active: true,
    },
  });

  const nameValue = watch('name');

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    if (editingCategory) {
      reset({
        name: editingCategory.name,
        slug: editingCategory.slug,
        description: editingCategory.description ?? '',
        is_active: editingCategory.is_active,
      });
    } else {
      reset({ name: '', slug: '', description: '', is_active: true });
    }
  }, [isOpen, editingCategory, reset]);

  const isPending = createCategory.isPending || updateCategory.isPending;

  const onSubmit = async (values: CategoryFormValues) => {
    setServerError(null);
    const payload = {
      ...values,
      description: values.description?.trim() ? values.description.trim() : null,
    };

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, payload });
      } else {
        await createCategory.mutateAsync(payload);
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
      title={editingCategory ? 'Edit Category' : 'Create Category'}
      description="Categories organize products across the storefront."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <Input
          label="Category name"
          placeholder="Electronics"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Slug"
          placeholder="electronics"
          error={errors.slug?.message}
          rightElement={
            <button
              type="button"
              onClick={() => setValue('slug', slugify(nameValue), { shouldValidate: true })}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Auto
            </button>
          }
          {...register('slug')}
        />

        <Textarea
          label="Description (optional)"
          placeholder="Short description..."
          error={errors.description?.message}
          {...register('description')}
        />

        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            {...register('is_active')}
          />
          <span>Category is active</span>
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            {editingCategory ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
