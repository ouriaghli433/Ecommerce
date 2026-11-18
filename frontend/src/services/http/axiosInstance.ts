import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  const guestToken = useCartStore.getState().guestToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (guestToken) {
    config.headers['X-Guest-Token'] = guestToken;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url ?? '';
      const isAuthCredentialAttempt =
        requestUrl.includes('/login') || requestUrl.includes('/register');

      if (!isAuthCredentialAttempt && useAuthStore.getState().token) {
        useAuthStore.getState().clearSession();
      }
    }
    return Promise.reject(error);
  }
);
