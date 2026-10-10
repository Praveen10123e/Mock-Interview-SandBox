import { useAuthStore } from '../../store/AuthStore';
import type { InternalAxiosRequestConfig } from 'axios';

export const requestInterceptor = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  const state = useAuthStore.getState();
  const token = state.accessToken;
  const userId = state.user?.id;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
    if (userId) {
      config.headers['x-identity-id'] = userId;
    }
  }
  return config;
};

export const requestErrorInterceptor = (error: any) => {
  return Promise.reject(error);
};
