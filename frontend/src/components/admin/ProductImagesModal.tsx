import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addProductImage,
  deleteProductImage,
  listProductImages,
  setPrimaryProductImage,
} from '@/api/catalog'
import { getErrorMessage, parseApiError } from '@/api/client'
import type { Product } from '@/api/types'
import { ProductThumb } from '@/components/shop/ProductThumb'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StarIcon, TrashIcon } from '@/components/ui/Icons'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useImageUpload } from '@/hooks/useImageUpload'
import { cn } from '@/lib/utils'

/**
 * The gallery of one product: add a picture from the computer or from an
 * address, choose the main one, remove the others.
 *
 * The rules live in the backend: the first picture becomes the main one,
 * and deleting the main one promotes the next.
 */
export function ProductImagesModal({
  product,
  open,
  onClose,
}: {
  product: Product | null
  open: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { uploadAll, progress } = useImageUpload()

  const [source, setSource] = useState<'file' | 'url'>('file')
  const [files, setFiles] = useState<File[]>([])
  const [url, setUrl] = useState('')
  const [altText, setAltText] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const productId = product?.id ?? ''

  const imagesQuery = useQuery({
    queryKey: ['product-images', productId],
    queryFn: () => listProductImages(productId),
    enabled: open && Boolean(productId),
  })

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] }),
      queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['product', productId] }),
    ])

  function resetForm() {
    setFiles([])
    setUrl('')
    setAltText('')
    setErrors({})

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      // Several files from the computer, or one address.
      if (source === 'file') {
        return uploadAll(productId, files, altText)
      }

      await addProductImage(productId, { url, alt_text: altText || undefined })

      return { uploaded: 1, errors: [] as string[] }
    },
    onSuccess: async (result) => {
      await refresh()
      resetForm()

      if (result.uploaded > 0) {
        toast.success(
          result.uploaded === 1 ? 'Picture added.' : `${result.uploaded} pictures added.`,
        )
      }

      // Files the backend refused are named, so the admin knows which ones.
      for (const message of result.errors) {
        toast.error(message)
      }
    },
    onError: (error) => {
      const info = parseApiError(error)
      setErrors(info.fieldErrors)

      if (Object.keys(info.fieldErrors).length === 0) toast.error(info.message)
    },
  })

  const primaryMutation = useMutation({
    mutationFn: (imageId: string) => setPrimaryProductImage(productId, imageId),
    onSuccess: async () => {
      await refresh()
      toast.success('Main picture updated.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => deleteProductImage(productId, imageId),
    onSuccess: async () => {
      await refresh()
      toast.info('Picture removed.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onAdd(event: FormEvent) {
    event.preventDefault()
    setErrors({})

    if (source === 'file' && files.length === 0) {
      setErrors({ file: 'Choose one or more pictures from your computer.' })

      return
    }

    addMutation.mutate()
  }

  const images = imagesQuery.data ?? []

  return (
    <Modal
      open={open}
      title={product ? `Pictures — ${product.name}` : 'Pictures'}
      onClose={() => {
        resetForm()
        onClose()
      }}
      footer={
        <Button
          onClick={() => {
            resetForm()
            onClose()
          }}
        >
          Done
        </Button>
      }
    >
      <div className="space-y-5">
        {imagesQuery.isPending && <Skeleton className="h-24 w-full" />}

        {imagesQuery.data && images.length === 0 && (
          <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-muted">
            No picture yet. The first one you add becomes the main picture shown in the shop.
          </p>
        )}

        {images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image) => (
              <li key={image.id} className="space-y-2">
                <div className="aspect-square overflow-hidden rounded-2xl bg-sage-soft">
                  <ProductThumb
                    name={product?.name ?? ''}
                    url={image.url}
                    alt={image.alt_text}
                    textClassName="text-lg"
                  />
                </div>

                <div className="flex items-center justify-between gap-1">
                  {image.is_primary ? (
                    <Badge tone="sage">Main</Badge>
                  ) : (
                    <button
                      type="button"
                      onClick={() => primaryMutation.mutate(image.id)}
                      disabled={primaryMutation.isPending}
                      title="Use as the main picture"
                      className="flex items-center gap-1 rounded-pill px-2 py-1 text-xs text-muted transition hover:bg-cream hover:text-navy"
                    >
                      <StarIcon className="h-3.5 w-3.5" />
                      Main
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(image.id)}
                    disabled={deleteMutation.isPending}
                    title="Remove this picture"
                    className="rounded-pill p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onAdd} className="space-y-4 border-t border-beige/60 pt-4" noValidate>
          {/* Where the picture comes from */}
          <div className="flex gap-2">
            {[
              { value: 'file', label: 'From my computer' },
              { value: 'url', label: 'From a link' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSource(option.value as 'file' | 'url')
                  setErrors({})
                }}
                className={cn(
                  'rounded-pill px-4 py-2 text-sm transition',
                  source === option.value
                    ? 'bg-navy text-white'
                    : 'bg-cream text-muted hover:text-navy',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {source === 'file' ? (
            <div className="space-y-1.5">
              <label htmlFor="picture-file" className="text-sm font-medium text-navy">
                Picture files
              </label>

              <input
                id="picture-file"
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(event) => {
                  setFiles(Array.from(event.target.files ?? []))
                  setErrors({})
                }}
                className="w-full rounded-2xl border border-beige bg-white px-4 py-2.5 text-sm text-navy file:mr-3 file:rounded-pill file:border-0 file:bg-navy file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-navy-light"
              />

              {errors.file ? (
                <p className="text-xs text-red-600">{errors.file}</p>
              ) : (
                <p className="text-xs text-muted">
                  JPG, PNG, WEBP or AVIF · up to 4 MB each · several can be chosen
                  {files.length > 0 && ` · ${files.length} selected`}
                </p>
              )}
            </div>
          ) : (
            <Input
              label="Picture address"
              placeholder="https://…/photo.jpg"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              error={errors.url}
              hint="A full link to an image file."
            />
          )}

          <Input
            label="Description for screen readers (optional)"
            placeholder="Blue phone, seen from the back"
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            error={errors.alt_text}
          />

          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary" loading={addMutation.isPending}>
              {source === 'file' && files.length > 1 ? 'Add the pictures' : 'Add the picture'}
            </Button>

            {progress && (
              <span className="text-xs text-muted">
                Sending {progress.done} of {progress.total}…
              </span>
            )}
          </div>
        </form>
      </div>
    </Modal>
  )
}
