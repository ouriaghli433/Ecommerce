import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '@/api/client'
import { listUsers, updateUser } from '@/api/users'
import type { Role, User } from '@/api/types'
import { AdminCard, AdminPageHeader } from '@/components/admin/AdminPage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'

export function AdminUsersPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<User | null>(null)
  const [role, setRole] = useState<Role>('customer')

  const usersQuery = useQuery({ queryKey: ['admin-users', page], queryFn: () => listUsers(page) })

  const roleMutation = useMutation({
    mutationFn: ({ id, nextRole }: { id: string; nextRole: Role }) =>
      updateUser(id, { role: nextRole }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setEditing(null)
      toast.success('Role updated.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="The role decides what a person can do. This page is the only place where a role changes."
      />

      {usersQuery.isPending && <Skeleton className="h-64 w-full" />}

      {usersQuery.isError && (
        <ErrorState
          message={getErrorMessage(usersQuery.error)}
          onRetry={() => usersQuery.refetch()}
        />
      )}

      {usersQuery.data && (
        <AdminCard bodyClassName="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Member since</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.data.map((user) => (
                  <tr key={user.id} className="transition hover:bg-cream">
                    <Td>
                      {user.first_name} {user.last_name}
                    </Td>
                    <Td className="text-muted">{user.email}</Td>
                    <Td>
                      <Badge tone={user.role === 'admin' ? 'navy' : 'sage'}>{user.role}</Badge>
                    </Td>
                    <Td className="text-muted">{formatDate(user.created_at)}</Td>
                    <Td className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(user)
                          setRole(user.role)
                        }}
                      >
                        Change role
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
        </AdminCard>
      )}

      {usersQuery.data && (
        <Pagination
          currentPage={usersQuery.data.meta.current_page}
          lastPage={usersQuery.data.meta.last_page}
          onPageChange={setPage}
        />
      )}

      <Modal
        open={editing !== null}
        title={`Role of ${editing?.first_name ?? ''}`}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              loading={roleMutation.isPending}
              onClick={() => editing && roleMutation.mutate({ id: editing.id, nextRole: role })}
            >
              Save
            </Button>
          </>
        }
      >
        <Select
          label="Role"
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          options={[
            { value: 'customer', label: 'Customer' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
        <p className="mt-3 text-xs text-muted">
          An admin can manage the catalogue, stock, coupons and every order.
        </p>
      </Modal>
    </div>
  )
}
