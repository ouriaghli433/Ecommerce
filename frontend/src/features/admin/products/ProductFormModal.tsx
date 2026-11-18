import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { applyLaravelFieldErrors } from '@/services/http/errorParser';
import type { Category, Product } from '@/types';
import { slugify } from '@/utils/format';
import { centimesToMajor, majorToCentimes } from '@/utils/money';
import { parseProductAttributes } from '@/utils/product';
import { useCreateProduct, useUpdateProduct } from '../useAdminQueries';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  slug: z.string().trim().min(1, 'Slug is required').max(120),
  sku: z.string().trim().min(1, 'SKU is required').max(100),
  price_major: z.coerce.number().positive('Price must be greater than 0'),
  description: z.string().optional().nullable(),
  category_id: z.string().uuid('Select a valid category'),
  is_active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface AttributePair {
  key: string;
  value: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  editingProduct?: Product | null;
}

export function ProductFormModal({
  isOpen,
  onClose,
  categories,
  editingProduct,
}: ProductFormModalProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [serverError, setServerError] = useState<string | null>(null);
  const [attrPairs, setAttrPairs] = useState<AttributePair[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      sku: '',
      price_major: 0,
      description: '',
      category_id: '',
      is_active: true,
    },
  });

  const nameValue = watch('name');

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    if (editingProduct) {
      reset({
        name: editingProduct.name,
        slug: editingProduct.slug,
        sku: editingProduct.sku,
        price_major: Number(centimesToMajor(editingProduct.price)),
        description: editingProduct.description ?? '',
        category_id: editingProduct.category_id,
        is_active: editingProduct.is_active,
      });
      const parsedAttrs = parseProductAttributes(editingProduct.attributes);
      setAttrPairs(
        parsedAttrs
          ? Object.entries(parsedAttrs).map(([key, value]) => ({
              key,
              value: String(value ?? ''),
            }))
          : []
      );
    } else {
      reset({
        name: '',
        slug: '',
        sku: '',
        price_major: 100,
        description: '',
        category_id: categories[0]?.id ?? '',
        is_active: true,
      });
      setAttrPairs([]);
    }
  }, [isOpen, editingProduct, categories, reset]);

  const isPending = createProduct.isPending || updateProduct.isPending;

  const onSubmit = async (values: ProductFormValues) => {
    setServerError(null);
    const cleanedAttrs = attrPairs.reduce<Record<string, string>>((acc, pair) => {
      const k = pair.key.trim();
      const v = pair.value.trim();
      if (k) acc[k] = v;
      return acc;
    }, {});

    const payload = {
      name: values.name,
      slug: values.slug,
      sku: values.sku,
      price: majorToCentimes(values.price_major),
      description: values.description?.trim() ? values.description.trim() : null,
      category_id: values.category_id,
      is_active: values.is_active,
      attributes:
        Object.keys(cleanedAttrs).length > 0 ? JSON.stringify(cleanedAttrs) : null,
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, payload });
      } else {
        await createProduct.mutateAsync(payload);
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
      title={editingProduct ? 'Edit Product' : 'Create Product'}
      description="Price is entered in MAD and converted to integer centimes for the backend API."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Product name"
            placeholder="Wireless Headphones"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Slug"
            placeholder="wireless-headphones"
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
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="SKU"
            placeholder="PROD-001"
            error={errors.sku?.message}
            {...register('sku')}
          />
          <Input
            label="Price (MAD)"
            type="number"
            step="0.01"
            min="0.01"
            error={errors.price_major?.message}
            {...register('price_major')}
          />
          <Select
            label="Category"
            error={errors.category_id?.message}
            placeholder="Choose category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            {...register('category_id')}
          />
        </div>

        <Textarea
          label="Description"
          placeholder="Concise product description..."
          error={errors.description?.message}
          {...register('description')}
        />

        {/* Dynamic JSON Attributes Builder */}
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Attributes (JSON string)
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setAttrPairs((prev) => [...prev, { key: '', value: '' }])}
            >
              Add Attribute
            </Button>
          </div>
          {attrPairs.length === 0 ? (
            <p className="text-xs text-slate-500">No attributes configured.</p>
          ) : (
            <div className="space-y-2">
              {attrPairs.map((pair, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Key (e.g. color)"
                    value={pair.key}
                    onChange={(e) =>
                      setAttrPairs((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, key: e.target.value } : item))
                      )
                    }
                  />
                  <Input
                    placeholder="Value (e.g. matte black)"
                    value={pair.value}
                    onChange={(e) =>
                      setAttrPairs((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, value: e.target.value } : item
                        )
                      )
                    }
                  />
                  <button
                    type="button"
                    aria-label="Remove attribute"
                    onClick={() => setAttrPairs((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-900"
            {...register('is_active')}
          />
          <span>Product is active and visible in storefront</span>
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            {editingProduct ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
