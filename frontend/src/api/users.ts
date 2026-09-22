import { api } from './client'
import type { Paginated, Role, Single, User } from './types'

/** GET /users — admin only. */
export async function listUsers(page = 1): Promise<Paginated<User>> {
  const { data } = await api.get<Paginated<User>>('/users', { params: { page } })

  return data
}

export async function getUser(id: string): Promise<User> {
  const { data } = await api.get<Single<User>>(`/users/${id}`)

  return data.data
}

/** The only place where a role can change (admin only). */
export async function updateUser(
  id: string,
  payload: { first_name?: string; last_name?: string; role?: Role },
): Promise<User> {
  const { data } = await api.patch<Single<User>>(`/users/${id}`, payload)

  return data.data
}
