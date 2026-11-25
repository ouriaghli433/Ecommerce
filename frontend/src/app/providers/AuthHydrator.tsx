import { useEffect, type ReactNode } from 'react';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export function AuthHydrator({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setHydrated(true);
      return;
    }

    authApi
      .me()
      .then(({ user }) => {
        if (!cancelled) {
          setUser(user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, setUser, clearSession, setHydrated]);

  return <>{children}</>;
}
