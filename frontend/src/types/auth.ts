import type { UUID } from './common';

export type UserRole = 'admin' | 'customer';

export interface User {
  id: UUID;
  first_name: string;
  last_name: string;
  email: string;
  role?: UserRole;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface RegisterResponse {
  customer: User;
  token: string;
}

export interface MeResponse {
  user: User;
}

export interface LogoutResponse {
  message: string;
}
