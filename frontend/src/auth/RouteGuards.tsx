import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from './useAuth'

function FullPageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-8 w-8 text-sage" />
    </div>
  )
}

/**
 * Pages that need a logged-in user. A visitor is sent to the login page,
 * and comes back to the page they wanted after logging in.
 */
export function RequireAuth() {
  const { isLoggedIn, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}

/**
 * Admin pages. This only hides the interface: every admin endpoint is also
 * protected by a policy in Laravel, which is the real authority.
 */
export function RequireAdmin() {
  const { isLoggedIn, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

/** Login and register: a logged-in user has nothing to do there. */
export function RedirectIfLoggedIn() {
  const { isLoggedIn, loading } = useAuth()

  if (loading) return <FullPageLoader />

  if (isLoggedIn) return <Navigate to="/" replace />

  return <Outlet />
}
