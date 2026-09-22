import { api } from './client'
import type { AuthResponse, Single, User } from './types'

export interface RegisterPayload {
  first_name: string
  last_name: string
  email: string
  password: string
  password_confirmation: string
}

export interface LoginPayload {
  email: string
  password: string
}

/**
 * The backend always creates a customer here: the role cannot be chosen,
 * so the frontend does not even offer it.
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/register', payload)

  return data
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/login', payload)

  return data
}

export async function me(): Promise<User> {
  const { data } = await api.get<Single<User>>('/me')

  return data.data
}

export async function logout(): Promise<void> {
  await api.post('/logout')
}
