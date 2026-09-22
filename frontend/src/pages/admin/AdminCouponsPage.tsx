import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage, parseApiError } from '@/api/client'
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  updateCoupon,
  type CouponPayload,
} from '@/api/coupons'
import type { Coupon } from '@/api/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatMoney } from '@/lib/utils'

interface FormState {
  code: string
  type: 'percent' | 'fixed'
  /** percent: 1 to 100 · fixed: an amount in MAD, converted to centimes. */
  value: string
  min_order_amount: string
  max_usage: string
  per_user_limit: string
  starts_at: string
  expires_at: string
  is_active: boolean
}

const emptyForm: FormState = {
  code: '',
  type: 'percent',
  value: '',
  min_order_amount: '',
  max_usage: '',
  per_user_limit: '',
  starts_at: '',
  expires_at: '',
  is_active: true,
}

export function AdminCouponsPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<Coupon | null>(null)

  const couponsQuery = useQuery({ queryKey: ['coupons', page], queryFn: () => listCoupons(page) })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['coupons'] })

  const saveMutation = useMutation({
    mutationFn: (payload: CouponPayload) =>
      editing ? updateCoupon(editing.id, payload) : createCoupon(payload),
    onSuccess: async () => {
      await refresh()
      setFormOpen(false)
      toast.success(editing ? 'Coupon updated.' : 'Coupon created.')
    },
    onError: (error) => {
      const info = parseApiError(error)
      setErrors(info.fieldErrors)

      if (Object.keys(info.fieldErrors).length === 0) toast.error(info.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: async () => {
      await refresh()
      setToDelete(null)
      toast.success('Coupon deleted.')
    },
    onError: (error) => {
      // A coupon already used by an order cannot be deleted.
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

  function openEdit(coupon: Coupon) {
    setEditing(coupon)
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.type === 'percent' ? String(coupon.value) : (coupon.value / 100).toFixed(2),
      min_order_amount: coupon.min_order_amount ? (coupon.min_order_amount / 100).toFixed(2) : '',
      max_usage: coupon.max_usage ? String(coupon.max_usage) : '',
      per_user_limit: coupon.per_user_limit ? String(coupon.per_user_limit) : '',
      starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 10) : '',
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
      is_active: coupon.is_active,
    })
    setErrors({})
    setFormOpen(true)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({})

    saveMutation.mutate({
      code: form.code.toUpperCase(),
      type: form.type,
      value:
        form.type === 'percent' ? Number(form.value) : Math.round(Number(form.value) * 100),
      min_order_amount: form.min_order_amount
        ? Math.round(Number(form.min_order_amount) * 100)
        : 0,
      max_usage: form.max_usage ? Number(form.max_usage) : null,
      per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : null,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    })
  }

  function describeValue(coupon: Coupon): string {
    return coupon.type === 'percent' ? `${coupon.value}%` : formatMoney(coupon.value)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy">Coupons</h1>
          <p className="text-sm text-muted">
            The discount is applied by the shop at checkout, with its limits.
          </p>
        </div>
        <Button onClick={openCreate}>New coupon</Button>
      </div>

      {couponsQuery.isPending && <Skeleton className="h-64 w-full" />}

      {couponsQuery.isError && (
        <ErrorState
          message={getErrorMessage(couponsQuery.error)}
          onRetry={() => couponsQuery.refetch()}
        />
      )}

      {couponsQuery.data?.data.length === 0 && (
        <EmptyState title="No coupon" message="Create a code to offer a discount." />
      )}

      {couponsQuery.data && couponsQuery.data.data.length > 0 && (
        <Card>
          <CardBody className="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Discount</Th>
                  <Th>Minimum</Th>
                  <Th>Limits</Th>
                  <Th>Validity</Th>
                  <Th>State</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {couponsQuery.data.data.map((coupon) => (
                  <tr key={coupon.id}>
                    <Td className="font-medium">{coupon.code}</Td>
                    <Td>{describeValue(coupon)}</Td>
                    <Td className="text-muted">
                      {coupon.min_order_amount ? formatMoney(coupon.min_order_amount) : '—'}
                    </Td>
                    <Td className="text-muted">
                      {coupon.max_usage ?? '∞'} total · {coupon.per_user_limit ?? '∞'} per customer
                    </Td>
                    <Td className="text-muted">
                      {coupon.starts_at ? formatDate(coupon.starts_at) : 'now'} →{' '}
                      {coupon.expires_at ? formatDate(coupon.expires_at) : 'no end'}
                    </Td>
                    <Td>
                      <Badge tone={coupon.is_active ? 'success' : 'neutral'}>
                        {coupon.is_active ? 'Active' : 'Off'}
                      </Badge>
                    </Td>
                    <Td className="space-x-1 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(coupon)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setToDelete(coupon)}>
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

      {couponsQuery.data && (
        <Pagination
          currentPage={couponsQuery.data.meta.current_page}
          lastPage={couponsQuery.data.meta.last_page}
          onPageChange={setPage}
        />
      )}

      <Modal
        open={formOpen}
        title={editing ? 'Edit the coupon' : 'New coupon'}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button form="coupon-form" type="submit" loading={saveMutation.isPending}>
              Save
            </Button>
          </>
        }
      >
        <form id="coupon-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Code"
            value={form.code}
            onChange={(event) =>
              setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))
            }
            error={errors.code}
            placeholder="WELCOME10"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as 'percent' | 'fixed',
                }))
              }
              options={[
                { value: 'percent', label: 'Percentage' },
                { value: 'fixed', label: 'Fixed amount' },
              ]}
              error={errors.type}
            />

            <Input
              label={form.type === 'percent' ? 'Percent (1-100)' : 'Amount (MAD)'}
              type="number"
              step={form.type === 'percent' ? '1' : '0.01'}
              min="0"
              value={form.value}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
              error={errors.value}
              required
            />
          </div>

          <Input
            label="Minimum order (MAD)"
            type="number"
            step="0.01"
            min="0"
            value={form.min_order_amount}
            onChange={(event) =>
              setForm((current) => ({ ...current, min_order_amount: event.target.value }))
            }
            error={errors.min_order_amount}
            hint="Leave empty for no minimum."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Total uses"
              type="number"
              min="1"
              value={form.max_usage}
              onChange={(event) =>
                setForm((current) => ({ ...current, max_usage: event.target.value }))
              }
              error={errors.max_usage}
              hint="Empty = unlimited."
            />
            <Input
              label="Uses per customer"
              type="number"
              min="1"
              value={form.per_user_limit}
              onChange={(event) =>
                setForm((current) => ({ ...current, per_user_limit: event.target.value }))
              }
              error={errors.per_user_limit}
              hint="Empty = unlimited."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Starts on"
              type="date"
              value={form.starts_at}
              onChange={(event) =>
                setForm((current) => ({ ...current, starts_at: event.target.value }))
              }
              error={errors.starts_at}
            />
            <Input
              label="Ends on"
              type="date"
              value={form.expires_at}
              onChange={(event) =>
                setForm((current) => ({ ...current, expires_at: event.target.value }))
              }
              error={errors.expires_at}
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-navy">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            Active
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this coupon?"
        message="A coupon already used by an order cannot be deleted; turn it off instead."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
