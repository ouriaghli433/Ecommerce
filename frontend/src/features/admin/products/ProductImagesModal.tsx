import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image as ImageIcon, Plus, Star, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ErrorState } from '@/components/common';
import { Alert, Badge, Button, ConfirmDialog, Input, Modal, Skeleton } from '@/components/ui';
import { applyLaravelFieldErrors, parseApiError } from '@/services/http/errorParser';
import type { Product, ProductImage } from '@/types';
import {
  useAddProductImage,
  useDeleteProductImage,
  useProductImages,
  useUpdateProductImage,
} from '../useAdminQueries';

const imageSchema = z.object({
  image_url: z.string().trim().url('Enter a valid image URL (https://...)').max(2048),
  alt_text: z.string().trim().max(255).optional().nullable(),
  display_order: z.coerce.number().int().min(0, 'Must be 0 or greater'),
  is_primary: z.boolean(),
});

type ImageFormValues = z.infer<typeof imageSchema>;

interface ProductImagesModalProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductImagesModal({ product, onClose }: ProductImagesModalProps) {
  const productId = product?.id ?? '';
  const imagesQuery = useProductImages(product?.id);
  const addImage = useAddProductImage(productId);
  const updateImage = useUpdateProductImage(productId);
  const deleteImage = useDeleteProductImage(productId);

  const [formError, setFormError] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<ProductImage | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<ImageFormValues>({
    resolver: zodResolver(imageSchema),
    defaultValues: {
      image_url: '',
      alt_text: '',
      display_order: 0,
      is_primary: false,
    },
  });

  const previewUrl = watch('image_url');

  const onSubmit = async (values: ImageFormValues) => {
    setFormError(null);
    try {
      await addImage.mutateAsync({
        image_url: values.image_url,
        alt_text: values.alt_text?.trim() ? values.alt_text.trim() : null,
        display_order: values.display_order,
        is_primary: values.is_primary,
      });
      reset({
        image_url: '',
        alt_text: '',
        display_order: (imagesQuery.data?.length ?? 0) + 1,
        is_primary: false,
      });
    } catch (error) {
      const parsed = applyLaravelFieldErrors(error, setError);
      setFormError(parsed.message);
    }
  };

  const handleSetPrimary = async (image: ProductImage) => {
    try {
      await updateImage.mutateAsync({
        imageId: image.id,
        payload: { is_primary: true },
      });
    } catch (error) {
      setFormError(parseApiError(error).message);
    }
  };

  const handleDelete = async () => {
    if (!deletingImage) return;
    try {
      await deleteImage.mutateAsync(deletingImage.id);
      setDeletingImage(null);
    } catch (error) {
      setFormError(parseApiError(error).message);
    }
  };

  return (
    <>
      <Modal
        isOpen={Boolean(product)}
        onClose={onClose}
        size="lg"
        title={`Product Images — ${product?.name ?? ''}`}
        description="Backend stores external image URLs via JSON (no binary multipart upload endpoint exists)."
      >
        <div className="space-y-6">
          {formError && <Alert variant="error">{formError}</Alert>}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            noValidate
          >
            <p className="text-sm font-semibold text-slate-900">Add New Image URL</p>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <Input
                  label="Image URL"
                  placeholder="https://images.unsplash.com/..."
                  error={errors.image_url?.message}
                  {...register('image_url')}
                />
              </div>
              <div className="sm:col-span-4">
                <Input
                  label="Display order"
                  type="number"
                  min={0}
                  error={errors.display_order?.message}
                  {...register('display_order')}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-7">
                <Input
                  label="Alt text (optional)"
                  placeholder="Front view of product"
                  error={errors.alt_text?.message}
                  {...register('alt_text')}
                />
              </div>
              <div className="sm:col-span-5 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    {...register('is_primary')}
                  />
                  <span>Primary</span>
                </label>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  isLoading={addImage.isPending}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Add Image
                </Button>
              </div>
            </div>

            {previewUrl && previewUrl.startsWith('http') && (
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-14 w-14 rounded-lg border border-slate-200 object-cover bg-white"
                />
                <span className="text-xs text-slate-500">Live URL preview</span>
              </div>
            )}
          </form>

          {imagesQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
            </div>
          ) : imagesQuery.isError ? (
            <ErrorState
              title="Could not load product images"
              error={imagesQuery.error}
              onRetry={() => imagesQuery.refetch()}
            />
          ) : (imagesQuery.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
              <ImageIcon className="mb-2 h-6 w-6 text-slate-400" />
              No images attached to this product yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {(imagesQuery.data ?? []).map((img) => (
                <div
                  key={img.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <img
                      src={img.image_url}
                      alt={img.alt_text ?? product?.name ?? 'Product image'}
                      className="h-full w-full object-cover"
                    />
                    {img.is_primary && (
                      <span className="absolute top-2 left-2">
                        <Badge variant="success">Primary</Badge>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-2 p-3">
                    <div className="text-xs text-slate-500">
                      <p className="truncate font-medium text-slate-800">
                        {img.alt_text || 'No alt text'}
                      </p>
                      <p>Order: {img.display_order}</p>
                    </div>
                    <div className="flex items-center justify-between gap-1 border-t border-slate-100 pt-2">
                      {!img.is_primary ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          isLoading={updateImage.isPending}
                          leftIcon={<Star className="h-3.5 w-3.5" />}
                          onClick={() => handleSetPrimary(img)}
                        >
                          Primary
                        </Button>
                      ) : (
                        <span className="text-xs font-medium text-emerald-700">Default cover</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeletingImage(img)}
                        aria-label="Delete image"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingImage)}
        onClose={() => setDeletingImage(null)}
        onConfirm={handleDelete}
        isLoading={deleteImage.isPending}
        title="Delete Product Image"
        description="Are you sure you want to remove this image URL from the product?"
        confirmLabel="Delete Image"
      />
    </>
  );
}
