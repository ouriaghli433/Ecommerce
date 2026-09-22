import { api } from './client'
import type { Notification, Paginated, Single } from './types'

/** The list also carries meta.unread_count. */
export interface NotificationPage extends Paginated<Notification> {
  meta: Paginated<Notification>['meta'] & { unread_count: number }
}

export async function listNotifications(options: { unread?: boolean; page?: number } = {}) {
  const { data } = await api.get<NotificationPage>('/notifications', {
    params: { unread: options.unread ? 1 : undefined, page: options.page },
  })

  return data
}

export async function markNotificationAsRead(id: string): Promise<Notification> {
  const { data } = await api.patch<Single<Notification>>(`/notifications/${id}/read`)

  return data.data
}

export async function markAllNotificationsAsRead(): Promise<number> {
  const { data } = await api.post<{ marked_as_read: number }>('/notifications/read-all')

  return data.marked_as_read
}
