import type { UUID } from './common';

export interface Address {
  id: UUID;
  user_id: UUID;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  postal_code: string | null;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressPayload {
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  postal_code?: string | null;
  country: string;
  is_default?: boolean;
}

export interface AddressesResponse {
  addresses: Address[];
}

export interface AddressResponse {
  address: Address;
  message?: string;
}
