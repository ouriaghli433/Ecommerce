import { useQuery } from '@tanstack/react-query'
import { listNotifications } from '@/api/notifications'
import { useAuth } from '@/auth/useAuth'

export const UNREAD_KEY = ['notifications', 'unread-count']

/**
 * How many notifications the customer has not read yet, for the bell in
 * the navbar. Asked again every minute, and whenever the notifications
 * page changes something.
 */
export function useUnreadNotificationCount(): number {
  const { isLoggedIn } = useAuth()

  const query = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => listNotifications({ unread: true }),
    enabled: isLoggedIn,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  return query.data?.meta.unread_count ?? 0
}
