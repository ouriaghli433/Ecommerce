import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addProductImage,
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  updateProduct,
  type ProductPayload,
} from '@/api/catalog'
import { getErrorMessage, parseApiError } from '@/api/client'
import type { Product } from '@/api/types'
import { ProductThumb } from '@/components/shop/ProductThumb'
import { AdminCard, AdminPageHeader } from '@/components/admin/AdminPage'
import { ProductImagesModal } from '@/components/admin/ProductImagesModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { formatMoney } from '@/lib/utils'

interface FormState {
  name: string
  slug: string
  sku: string
  /** Shown in MAD for comfort, sent to the API in centimes. */
  price: string
  category_id: string
  description: string
  is_active: boolean
  /** Optional first picture, added right after the product is created. */
  image_url: string
}

const emptyForm: FormState = {
  name: '',
  slug: '',
  sku: '',
  price: '',
  category_id: '',
  description: '',
  is_active: true,
  image_url: '',
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function AdminProductsPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<Product | null>(null)
  const [imagesFor, setImagesFor] = useState<Product | null>(null)

  // Admins see inactive products too: the API checks the token.
  const productsQuery = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () => listProducts({ page }),
  })

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
    ])

  const saveMutation = useMutation({
    mutationFn: async (payload: ProductPayload) => {
      if (editing) {
        return updateProduct(editing.id, payload)
      }

      const created = await createProduct(payload)

      // A picture can only be attached once the product exists, so it is
      // added right after. A wrong address does not lose the product.
      if (form.image_url.trim()) {
        try {
          await addProductImage(created.id, { url: form.image_url.trim() })
        } catch {
          toast.error('The product was created, but its picture address was refused.')
        }
      }

      return created
    },
    onSuccess: async () => {
      await refresh()
      setFormOpen(false)
      toast.success(editing ? 'Product updated.' : 'Product created with an empty stock.')
    },
    onError: (error) => {
      const info = parseApiError(error)
      setErrors(info.fieldErrors)

      if (Object.keys(info.fieldErrors).length === 0) toast.error(info.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async () => {
      await refresh()
      setToDelete(null)
      toast.success('Product deleted.')
    },
    onError: (error) => {
      // A product with orders, carts or stock history cannot be deleted:
      // the backend says to deactivate it instead.
      setToDelete(null)
      toast.error(getErrorMessage(error))
    },
  })

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, category_id: categoriesQuery.data?.[0]?.id ?? '' })
    setErrors({})
    setFormOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setForm({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: (product.price / 100).toFixed(2),
      category_id: product.category_id,
      description: product.description ?? '',
      is_active: product.is_active,
      image_url: '',
    })
    setErrors({})
    setFormOpen(true)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({})

    saveMutation.mutate({
      name: form.name,
      slug: form.slug,
      sku: form.sku,
      price: Math.round(Number(form.price) * 100), // MAD -> centimes
      category_id: form.category_id,
      description: form.description || null,
      is_active: form.is_active,
    })
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products"
        description="A new product starts with an empty stock and no picture; add both from its own page."
        action={
          <Button onClick={openCreate} disabled={!categoriesQuery.data?.length}>
            New product
          </Button>
        }
      />

      {productsQuery.isPending && <Skeleton className="h-64 w-full" />}

      {productsQuery.isError && (
        <ErrorState
          message={getErrorMessage(productsQuery.error)}
          onRetry={() => productsQuery.refetch()}
        />
      )}

      {productsQuery.data?.data.length === 0 && (
        <EmptyState title="No product" message="Create your first product to fill the shop." />
      )}

      {productsQuery.data && productsQuery.data.data.length > 0 && (
        <AdminCard bodyClassName="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>SKU</Th>
                  <Th>Category</Th>
                  <Th>Price</Th>
                  <Th>State</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {productsQuery.data.data.map((product) => (
                  <tr key={product.id} className="transition hover:bg-cream">
                    <Td className="font-medium">
                      <span className="flex items-center gap-3">
                        <span className="h-10 w-10 flex-none overflow-hidden rounded-xl bg-sage-soft">
                          <ProductThumb
                            name={product.name}
                            url={product.primary_image_url}
                            textClassName="text-xs"
                          />
                        </span>
                        {product.name}
                      </span>
                    </Td>
                    <Td className="text-muted">{product.sku}</Td>
                    <Td className="text-muted">{product.category?.name ?? '—'}</Td>
                    <Td>{formatMoney(product.price)}</Td>
                    <Td>
                      <Badge tone={product.is_active ? 'success' : 'neutral'}>
                        {product.is_active ? 'On sale' : 'Hidden'}
                      </Badge>
                    </Td>
                    <Td className="space-x-1 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setImagesFor(product)}>
                        Pictures
                      </Button>
                      <Link to={`/admin/products/${product.id}/inventory`}>
                        <Button size="sm" variant="ghost">
                          Stock
                        </Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(product)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setToDelete(product)}>
                        Delete
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
        </AdminCard>
      )}

      {productsQuery.data && (
        <Pagination
          currentPage={productsQuery.data.meta.current_page}
          lastPage={productsQuery.data.meta.last_page}
          onPageChange={setPage}
        />
      )}

      <Modal
        open={formOpen}
        title={editing ? 'Edit the product' : 'New product'}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button form="product-form" type="submit" loading={saveMutation.isPending}>
              Save
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => {
              const name = event.target.value

              setForm((current) => ({
                ...current,
                name,
                slug: editing ? current.slug : slugify(name),
              }))
            }}
            error={errors.name}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Slug"
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              error={errors.slug}
              required
            />
            <Input
              label="SKU"
              value={form.sku}
              onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
              error={errors.sku}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Price (MAD)"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
              error={errors.price}
              hint="Stored as centimes."
              required
            />
            <Select
              label="Category"
              value={form.category_id}
              onChange={(event) =>
                setForm((current) => ({ ...current, category_id: event.target.value }))
              }
              options={(categoriesQuery.data ?? []).map((category) => ({
                value: category.id,
                label: category.name,
              }))}
              error={errors.category_id}
            />
          </div>

          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            error={errors.description}
          />

          {editing ? (
            <p className="rounded-2xl bg-cream px-4 py-3 text-xs text-muted">
              Pictures are managed from the “Pictures” button in the list.
            </p>
          ) : (
            <Input
              label="First picture (optional)"
              placeholder="https://…/photo.jpg"
              value={form.image_url}
              onChange={(event) =>
                setForm((current) => ({ ...current, image_url: event.target.value }))
              }
              hint="It becomes the main picture. More can be added afterwards."
            />
          )}

          <label className="flex items-center gap-3 text-sm text-navy">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            On sale
          </label>
        </form>
      </Modal>

      <ProductImagesModal
        product={imagesFor}
        open={imagesFor !== null}
        onClose={() => setImagesFor(null)}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this product?"
        message="A product with orders, carts or stock history cannot be deleted. Hide it instead by turning off 'On sale'."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
