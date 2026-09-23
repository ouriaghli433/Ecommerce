import { useState, type FormEvent } from 'react'
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

/**
 * The gallery of one product: add a picture from its address, choose the
 * main one, remove the others.
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

  const addMutation = useMutation({
    mutationFn: () => addProductImage(productId, { url, alt_text: altText || undefined }),
    onSuccess: async () => {
      await refresh()
      setUrl('')
      setAltText('')
      toast.success('Picture added.')
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
    addMutation.mutate()
  }

  const images = imagesQuery.data ?? []

  return (
    <Modal
      open={open}
      title={product ? `Pictures — ${product.name}` : 'Pictures'}
      onClose={onClose}
      footer={<Button onClick={onClose}>Done</Button>}
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

        <form onSubmit={onAdd} className="space-y-3 border-t border-beige/60 pt-4" noValidate>
          <Input
            label="Picture address"
            placeholder="https://…/photo.jpg"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            error={errors.url}
            hint="A full link to the image file."
            required
          />

          <Input
            label="Description for screen readers (optional)"
            placeholder="Blue phone, seen from the back"
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            error={errors.alt_text}
          />

          <Button type="submit" variant="secondary" loading={addMutation.isPending}>
            Add the picture
          </Button>
        </form>
      </div>
    </Modal>
  )
}
