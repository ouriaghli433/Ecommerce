import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '@/api/auth'
import { getToken, setToken } from '@/api/client'
import type { User } from '@/api/types'

interface AuthContextValue {
  user: User | null
  /** True while we check the saved token when the app starts. */
  loading: boolean
  isLoggedIn: boolean
  /** Only hides or shows parts of the interface. Laravel does the real check. */
  isAdmin: boolean
  login: (email: string, password: string) => Promise<User>
  register: (payload: authApi.RegisterPayload) => Promise<User>
  logout: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

/** The API sends { data: user } for /me and sometimes a bare user. */
function unwrapUser(value: { data: User } | User): User {
  return 'data' in value ? value.data : value
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On the first render, a saved token is checked against /me. If it is no
  // longer valid, we simply start logged out.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)

      return
    }

    authApi
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password })
    const loggedIn = unwrapUser(response.user)

    setToken(response.token)
    setUser(loggedIn)

    return loggedIn
  }, [])

  const register = useCallback(async (payload: authApi.RegisterPayload) => {
    const response = await authApi.register(payload)
    const created = unwrapUser(response.user)

    setToken(response.token)
    setUser(created)

    return created
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Even if the call fails, the local session must end.
    }

    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isLoggedIn: user !== null,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
