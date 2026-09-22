import { useContext } from 'react'
import { AuthContext } from './AuthContext'

/** Gives the current user and the login/register/logout actions. */
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }

  return context
}
