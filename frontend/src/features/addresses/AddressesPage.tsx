import { useState } from 'react';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
import { ErrorState } from '@/components/common';
import { Badge, Button, Card, CardContent, ConfirmDialog, EmptyState, Skeleton } from '@/components/ui';
import { parseApiError } from '@/services/http/errorParser';
import type { Address } from '@/types';
import { AddressFormModal } from './AddressFormModal';
import { useAddresses, useDeleteAddress, useUpdateAddress } from './useAddresses';

export function AddressesPage() {
  const toast = useToast();
  const addressesQuery = useAddresses();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);

  const addresses = addressesQuery.data ?? [];

  const handleSetDefault = async (address: Address) => {
    try {
      await updateAddress.mutateAsync({
        id: address.id,
        payload: { is_default: true },
      });
    } catch (error) {
      toast.error('Update failed', parseApiError(error).message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteAddress.mutateAsync(deleting.id);
      setDeleting(null);
    } catch (error) {
      toast.error('Delete failed', parseApiError(error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Shipping Addresses</h2>
          <p className="text-sm text-slate-500">
            Manage delivery addresses used during checkout.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          Add Address
        </Button>
      </div>

      {addressesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : addressesQuery.isError ? (
        <ErrorState
          title="Could not load addresses"
          error={addressesQuery.error}
          onRetry={() => addressesQuery.refetch()}
        />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-6 w-6" />}
          title="No shipping addresses saved"
          description="Add a shipping address to speed up checkout."
          action={
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              Add First Address
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id} className={address.is_default ? 'border-emerald-300 ring-1 ring-emerald-100' : undefined}>
              <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{address.full_name}</p>
                    {address.is_default && <Badge variant="success">Default</Badge>}
                  </div>
                  <p className="text-sm text-slate-600">{address.address_line}</p>
                  <p className="text-sm text-slate-600">
                    {address.city}
                    {address.postal_code ? `, ${address.postal_code}` : ''} &middot;{' '}
                    {address.country}
                  </p>
                  <p className="text-xs text-slate-500">Phone: {address.phone}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  {!address.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={updateAddress.isPending}
                      leftIcon={<Star className="h-3.5 w-3.5" />}
                      onClick={() => handleSetDefault(address)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setEditing(address);
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setDeleting(address)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddressFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingAddress={editing}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteAddress.isPending}
        title="Delete Shipping Address"
        description={`Are you sure you want to remove the address for ${deleting?.full_name ?? 'this recipient'}?`}
        confirmLabel="Delete Address"
      />
    </div>
  );
}
