import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Alert, Button } from '@/components/ui';
import { getUserRole, useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const location = useLocation();

  if (token && !isHydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-slate-900" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = getUserRole(user);
    if (!role || !allowedRoles.includes(role)) {
      return (
        <div className="mx-auto max-w-xl px-4 py-16">
          <Alert
            variant="error"
            title="Access Denied (403)"
            action={
              <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                Go Back
              </Button>
            }
          >
            You do not have permission to view this page with your current account role ({role}).
          </Alert>
        </div>
      );
    }
  }

  return <Outlet />;
}

export function GuestOnlyRoute() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  if (token && user) {
    const role = getUserRole(user);
    return <Navigate to={role === 'admin' ? '/admin' : '/'} replace />;
  }

  return <Outlet />;
}
