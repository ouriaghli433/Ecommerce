import { api } from './client'
import type { Address, Single } from './types'

export interface AddressPayload {
  full_name: string
  phone: string
  address_line: string
  city: string
  postal_code?: string | null
  /** Two uppercase letters, for example MA. */
  country: string
  is_default?: boolean
}

export async function listAddresses(): Promise<Address[]> {
  const { data } = await api.get<{ data: Address[] }>('/addresses')

  return data.data
}

export async function createAddress(payload: AddressPayload): Promise<Address> {
  const { data } = await api.post<Single<Address>>('/addresses', payload)

  return data.data
}

export async function updateAddress(
  id: string,
  payload: Partial<AddressPayload>,
): Promise<Address> {
  const { data } = await api.patch<Single<Address>>(`/addresses/${id}`, payload)

  return data.data
}

export async function deleteAddress(id: string): Promise<void> {
  await api.delete(`/addresses/${id}`)
}
