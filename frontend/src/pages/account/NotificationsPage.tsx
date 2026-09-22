import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '@/api/client'
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/notifications'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { cn, formatDate } from '@/lib/utils'

export function NotificationsPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)

  const notificationsQuery = useQuery({
    queryKey: ['notifications', { unreadOnly, page }],
    queryFn: () => listNotifications({ unread: unreadOnly, page }),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })

  const readOne = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: refresh,
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const readAll = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: async (count) => {
      await refresh()
      toast.success(count > 0 ? `${count} notification(s) marked as read.` : 'Nothing to mark.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const unreadCount = notificationsQuery.data?.meta.unread_count ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold text-navy">Notifications</h1>
          {unreadCount > 0 && <Badge tone="navy">{unreadCount} new</Badge>}
        </div>

        <Button
          variant="ghost"
          size="sm"
          loading={readAll.isPending}
          disabled={unreadCount === 0}
          onClick={() => readAll.mutate()}
        >
          Mark all as read
        </Button>
      </div>

      <div className="flex gap-2">
        {[
          { label: 'All', value: false },
          { label: 'Unread', value: true },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => {
              setUnreadOnly(option.value)
              setPage(1)
            }}
            className={cn(
              'rounded-pill px-4 py-2 text-sm transition',
              unreadOnly === option.value
                ? 'bg-navy text-white'
                : 'bg-white text-muted hover:text-navy',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {notificationsQuery.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {notificationsQuery.isError && (
        <ErrorState
          message={getErrorMessage(notificationsQuery.error)}
          onRetry={() => notificationsQuery.refetch()}
        />
      )}

      {notificationsQuery.data?.data.length === 0 && (
        <EmptyState
          title={unreadOnly ? 'Nothing unread' : 'No notification yet'}
          message="Messages about your orders and payments will appear here."
        />
      )}

      <div className="space-y-3">
        {notificationsQuery.data?.data.map((notification) => (
          <Card key={notification.id} className={cn(!notification.is_read && 'border-l-4 border-sage')}>
            <CardBody className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium text-navy">{notification.title}</p>
                <p className="text-sm text-muted">{notification.message}</p>
                <p className="text-xs text-muted">{formatDate(notification.created_at)}</p>
              </div>

              {!notification.is_read && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={readOne.isPending && readOne.variables === notification.id}
                  onClick={() => readOne.mutate(notification.id)}
                >
                  Mark as read
                </Button>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {notificationsQuery.data && (
        <Pagination
          currentPage={notificationsQuery.data.meta.current_page}
          lastPage={notificationsQuery.data.meta.last_page}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
