import { axiosInstance } from '@/services/http/axiosInstance';
import type {
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RegisterPayload,
  RegisterResponse,
} from '@/types';

export const authApi = {
  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const { data } = await axiosInstance.post<RegisterResponse>('/register', payload);
    return data;
  },

  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await axiosInstance.post<LoginResponse>('/login', payload);
    return data;
  },

  async me(): Promise<MeResponse> {
    const { data } = await axiosInstance.get<MeResponse>('/me');
    return data;
  },

  async logout(): Promise<LogoutResponse> {
    const { data } = await axiosInstance.post<LogoutResponse>('/logout');
    return data;
  },
};
