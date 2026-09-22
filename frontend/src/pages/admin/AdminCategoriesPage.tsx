import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryPayload,
} from '@/api/catalog'
import { getErrorMessage, parseApiError } from '@/api/client'
import type { Category } from '@/api/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'

const emptyForm: CategoryPayload = {
  name: '',
  slug: '',
  description: '',
  is_active: true,
  parent_id: null,
}

/** "Desk lamps" -> "desk-lamps" */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function AdminCategoriesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryPayload>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<Category | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['categories'] })

  const saveMutation = useMutation({
    mutationFn: (payload: CategoryPayload) =>
      editing ? updateCategory(editing.id, payload) : createCategory(payload),
    onSuccess: async () => {
      await refresh()
      setFormOpen(false)
      toast.success(editing ? 'Category updated.' : 'Category created.')
    },
    onError: (error) => {
      const info = parseApiError(error)
      setErrors(info.fieldErrors)

      if (Object.keys(info.fieldErrors).length === 0) toast.error(info.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: async () => {
      await refresh()
      setToDelete(null)
      toast.success('Category deleted.')
    },
    onError: (error) => {
      // The backend refuses while the category still has products or
      // sub-categories, and says so.
      setToDelete(null)
      toast.error(getErrorMessage(error))
    },
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setFormOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      is_active: category.is_active,
      parent_id: category.parent_id,
    })
    setErrors({})
    setFormOpen(true)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    saveMutation.mutate({ ...form, parent_id: form.parent_id || null })
  }

  const parentOptions = (categoriesQuery.data ?? [])
    .filter((category) => category.id !== editing?.id)
    .map((category) => ({ value: category.id, label: category.name }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy">Categories</h1>
          <p className="text-sm text-muted">Group the products of the shop.</p>
        </div>
        <Button onClick={openCreate}>New category</Button>
      </div>

      {categoriesQuery.isPending && <Skeleton className="h-64 w-full" />}

      {categoriesQuery.isError && (
        <ErrorState
          message={getErrorMessage(categoriesQuery.error)}
          onRetry={() => categoriesQuery.refetch()}
        />
      )}

      {categoriesQuery.data?.length === 0 && (
        <EmptyState
          title="No category"
          message="Create a first category to organise the catalogue."
          action={
            <Button size="sm" variant="secondary" onClick={openCreate}>
              New category
            </Button>
          }
        />
      )}

      {categoriesQuery.data && categoriesQuery.data.length > 0 && (
        <Card>
          <CardBody className="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Slug</Th>
                  <Th>Parent</Th>
                  <Th>State</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {categoriesQuery.data.map((category) => (
                  <tr key={category.id}>
                    <Td className="font-medium">{category.name}</Td>
                    <Td className="text-muted">{category.slug}</Td>
                    <Td className="text-muted">
                      {categoriesQuery.data.find((item) => item.id === category.parent_id)?.name ??
                        '—'}
                    </Td>
                    <Td>
                      <Badge tone={category.is_active ? 'success' : 'neutral'}>
                        {category.is_active ? 'Visible' : 'Hidden'}
                      </Badge>
                    </Td>
                    <Td className="space-x-1 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(category)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setToDelete(category)}>
                        Delete
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <Modal
        open={formOpen}
        title={editing ? 'Edit the category' : 'New category'}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button form="category-form" type="submit" loading={saveMutation.isPending}>
              Save
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => {
              const name = event.target.value

              setForm((current) => ({
                ...current,
                name,
                // The slug follows the name until it is edited by hand.
                slug: editing ? current.slug : slugify(name),
              }))
            }}
            error={errors.name}
            required
          />

          <Input
            label="Slug"
            value={form.slug}
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            error={errors.slug}
            hint="Used in the address of the page."
            required
          />

          <Textarea
            label="Description"
            rows={3}
            value={form.description ?? ''}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            error={errors.description}
          />

          <Select
            label="Parent category"
            placeholder="None"
            value={form.parent_id ?? ''}
            onChange={(event) =>
              setForm((current) => ({ ...current, parent_id: event.target.value || null }))
            }
            options={parentOptions}
            error={errors.parent_id}
          />

          <label className="flex items-center gap-3 text-sm text-navy">
            <input
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            Visible in the shop
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this category?"
        message="It can only be deleted if it has no product and no sub-category."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
