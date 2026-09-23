import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProduct } from '@/api/catalog'
import { getErrorMessage, parseApiError } from '@/api/client'
import { createMovement, getInventory, listMovements } from '@/api/inventory'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AdminCard, AdminPageHeader } from '@/components/admin/AdminPage'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { formatDate, humanize } from '@/lib/utils'

type MovementForm = {
  type: 'purchase' | 'return' | 'damage' | 'adjustment'
  quantity: string
  reason: string
}

const movementTypes = [
  { value: 'purchase', label: 'Purchase (stock arrives)' },
  { value: 'return', label: 'Return (a customer sends it back)' },
  { value: 'damage', label: 'Damage (units are lost)' },
  { value: 'adjustment', label: 'Adjustment (after a count)' },
]

export function AdminInventoryPage() {
  const { productId = '' } = useParams()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [form, setForm] = useState<MovementForm>({ type: 'purchase', quantity: '', reason: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const productQuery = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
  })

  const inventoryQuery = useQuery({
    queryKey: ['inventory', productId],
    queryFn: () => getInventory(productId),
  })

  const movementsQuery = useQuery({
    queryKey: ['movements', productId, page],
    queryFn: () => listMovements(productId, page),
  })

  const movementMutation = useMutation({
    mutationFn: (payload: { type: MovementForm['type']; quantity: number; reason?: string }) =>
      createMovement(productId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory', productId] }),
        queryClient.invalidateQueries({ queryKey: ['movements', productId] }),
        queryClient.invalidateQueries({ queryKey: ['product', productId] }),
      ])

      setForm({ type: 'purchase', quantity: '', reason: '' })
      toast.success('Stock updated.')
    },
    onError: (error) => {
      const info = parseApiError(error)
      setErrors(info.fieldErrors)

      if (Object.keys(info.fieldErrors).length === 0) toast.error(info.message)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({})

    const quantity = Number(form.quantity)

    // Damage removes units, so the number sent is negative. The backend
    // checks the sign again and refuses anything else.
    const signed = form.type === 'damage' ? -Math.abs(quantity) : quantity

    movementMutation.mutate({
      type: form.type,
      quantity: signed,
      reason: form.reason || undefined,
    })
  }

  if (inventoryQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(inventoryQuery.error)}
        onRetry={() => inventoryQuery.refetch()}
      />
    )
  }

  const inventory = inventoryQuery.data

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin/products"
        backLabel="All products"
        title={`Stock — ${productQuery.data?.name ?? '…'}`}
        description={`SKU ${productQuery.data?.sku ?? '…'} · reservations, releases and sales are created by checkout and payments, never here.`}
      />

      {/* The three numbers, explained */}
      {inventoryQuery.isPending || !inventory ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <AdminCard>
              <p className="text-xs uppercase tracking-wide text-muted">On hand</p>
              <p className="mt-1 font-display text-3xl font-semibold text-navy">
                {inventory.on_hand}
              </p>
              <p className="mt-1 text-xs text-muted">Units physically in the warehouse.</p>
          </AdminCard>

          <AdminCard>
              <p className="text-xs uppercase tracking-wide text-muted">Reserved</p>
              <p className="mt-1 font-display text-3xl font-semibold text-navy">
                {inventory.reserved}
              </p>
              <p className="mt-1 text-xs text-muted">Held for orders waiting for payment.</p>
          </AdminCard>

          <AdminCard className="bg-sage-soft">
              <p className="text-xs uppercase tracking-wide text-muted">Available</p>
              <p className="mt-1 font-display text-3xl font-semibold text-navy">
                {inventory.available}
              </p>
              <p className="mt-1 text-xs text-muted">On hand − reserved. Calculated, not stored.</p>
          </AdminCard>
        </div>
      )}

      {/* New movement */}
      <AdminCard title="Add a stock movement">
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <Select
              label="Type"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as MovementForm['type'],
                }))
              }
              options={movementTypes}
              error={errors.type}
            />

            <Input
              label="Quantity"
              type="number"
              step="1"
              value={form.quantity}
              onChange={(event) =>
                setForm((current) => ({ ...current, quantity: event.target.value }))
              }
              error={errors.quantity}
              hint={
                form.type === 'damage'
                  ? 'Units lost; it will be removed from the stock.'
                  : form.type === 'adjustment'
                    ? 'Use a negative number to remove units.'
                    : 'Units added to the stock.'
              }
              required
            />

            <div className="sm:col-span-2">
              <Input
                label="Reason (optional)"
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reason: event.target.value }))
                }
                error={errors.reason}
                placeholder="Supplier delivery, yearly count…"
              />
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" loading={movementMutation.isPending}>
                Save the movement
              </Button>
              <p className="mt-2 text-xs text-muted">
                Reservations, releases and sales are created by checkout and payments, never here.
              </p>
            </div>
          </form>
      </AdminCard>

      {/* History */}
      <AdminCard title="History" bodyClassName="p-0">
          {movementsQuery.isPending && <Skeleton className="m-6 h-40" />}

          {movementsQuery.data && movementsQuery.data.data.length === 0 && (
            <p className="px-6 py-8 text-sm text-muted">No movement yet.</p>
          )}

          {movementsQuery.data && movementsQuery.data.data.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>Quantity</Th>
                  <Th>Reason</Th>
                </tr>
              </thead>
              <tbody>
                {movementsQuery.data.data.map((movement) => (
                  <tr key={movement.id} className="transition hover:bg-cream">
                    <Td className="text-muted">{formatDate(movement.created_at)}</Td>
                    <Td>
                      <Badge tone={movement.quantity > 0 ? 'success' : 'danger'}>
                        {humanize(movement.type)}
                      </Badge>
                    </Td>
                    <Td className="font-medium">
                      {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                    </Td>
                    <Td className="text-muted">{movement.reason ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
      </AdminCard>

      {movementsQuery.data && (
        <Pagination
          currentPage={movementsQuery.data.meta.current_page}
          lastPage={movementsQuery.data.meta.last_page}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
