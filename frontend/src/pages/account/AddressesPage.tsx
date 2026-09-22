import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
  type AddressPayload,
} from '@/api/addresses'
import { getErrorMessage, parseApiError } from '@/api/client'
import type { Address } from '@/api/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'

const emptyForm: AddressPayload = {
  full_name: '',
  phone: '',
  address_line: '',
  city: '',
  postal_code: '',
  country: 'MA',
  is_default: false,
}

export function AddressesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const addressesQuery = useQuery({ queryKey: ['addresses'], queryFn: listAddresses })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [form, setForm] = useState<AddressPayload>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<Address | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['addresses'] })

  const saveMutation = useMutation({
    mutationFn: (payload: AddressPayload) =>
      editing ? updateAddress(editing.id, payload) : createAddress(payload),
    onSuccess: async () => {
      await refresh()
      setFormOpen(false)
      toast.success(editing ? 'Address updated.' : 'Address saved.')
    },
    onError: (error) => {
      const info = parseApiError(error)
      setErrors(info.fieldErrors)

      if (Object.keys(info.fieldErrors).length === 0) toast.error(info.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: async () => {
      await refresh()
      setToDelete(null)
      toast.info('Address deleted. Your past orders keep their own copy.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const defaultMutation = useMutation({
    mutationFn: (address: Address) => updateAddress(address.id, { is_default: true }),
    onSuccess: async () => {
      await refresh()
      toast.success('Default address updated.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setFormOpen(true)
  }

  function openEdit(address: Address) {
    setEditing(address)
    setForm({
      full_name: address.full_name,
      phone: address.phone,
      address_line: address.address_line,
      city: address.city,
      postal_code: address.postal_code ?? '',
      country: address.country,
      is_default: address.is_default,
    })
    setErrors({})
    setFormOpen(true)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    saveMutation.mutate({ ...form, country: form.country.toUpperCase() })
  }

  function update(field: keyof AddressPayload, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-navy">Delivery addresses</h1>
        <Button onClick={openCreate}>Add an address</Button>
      </div>

      {addressesQuery.isPending && <Skeleton className="h-32 w-full" />}

      {addressesQuery.isError && (
        <ErrorState
          message={getErrorMessage(addressesQuery.error)}
          onRetry={() => addressesQuery.refetch()}
        />
      )}

      {addressesQuery.data?.length === 0 && (
        <EmptyState
          title="No address yet"
          message="Add the address where your orders should be delivered."
          action={
            <Button variant="secondary" size="sm" onClick={openCreate}>
              Add an address
            </Button>
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {addressesQuery.data?.map((address) => (
          <Card key={address.id}>
            <CardBody className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-navy">{address.full_name}</p>
                {address.is_default && <Badge tone="sage">Default</Badge>}
              </div>

              <div className="text-sm text-muted">
                <p>{address.address_line}</p>
                <p>
                  {address.city}
                  {address.postal_code ? ` ${address.postal_code}` : ''}, {address.country}
                </p>
                <p>{address.phone}</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(address)}>
                  Edit
                </Button>

                {!address.is_default && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={defaultMutation.isPending}
                    onClick={() => defaultMutation.mutate(address)}
                  >
                    Make default
                  </Button>
                )}

                <Button size="sm" variant="ghost" onClick={() => setToDelete(address)}>
                  Delete
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        open={formOpen}
        title={editing ? 'Edit the address' : 'New address'}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button form="address-form" type="submit" loading={saveMutation.isPending}>
              Save
            </Button>
          </>
        }
      >
        <form id="address-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Full name"
            value={form.full_name}
            onChange={(event) => update('full_name', event.target.value)}
            error={errors.full_name}
            required
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            error={errors.phone}
            required
          />
          <Input
            label="Street address"
            value={form.address_line}
            onChange={(event) => update('address_line', event.target.value)}
            error={errors.address_line}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="City"
              value={form.city}
              onChange={(event) => update('city', event.target.value)}
              error={errors.city}
              required
            />
            <Input
              label="Postal code"
              value={form.postal_code ?? ''}
              onChange={(event) => update('postal_code', event.target.value)}
              error={errors.postal_code}
            />
          </div>

          <Input
            label="Country code"
            value={form.country}
            onChange={(event) => update('country', event.target.value.toUpperCase())}
            error={errors.country}
            hint="Two letters, for example MA."
            maxLength={2}
            required
          />

          <label className="flex items-center gap-3 text-sm text-navy">
            <input
              type="checkbox"
              checked={Boolean(form.is_default)}
              onChange={(event) => update('is_default', event.target.checked)}
            />
            Use this address by default
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this address?"
        message="Your past orders keep their own copy of it, so they are not affected."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
