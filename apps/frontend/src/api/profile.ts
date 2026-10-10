import api from './axios/instance';

export const profileApi = {
  getCompletionStatus: async () => {
    const response = await api.get('/users/profile/me/completion');
    return response.data?.data ?? response.data;
  },
  getProfile: async (email?: string) => {
    const response = await api.get('/users/profile', {
      params: email ? { email } : undefined,
    });
    return response.data?.data ?? response.data;
  },
  updateProfile: async (data: any) => {
    const response = await api.put('/users/profile', data);
    return response.data?.data ?? response.data;
  },
  getStats: async () => {
    const response = await api.get('/users/profile/stats');
    return response.data?.data ?? response.data;
  },
  updatePreferences: async (data: any) => {
    const response = await api.patch('/users/profile/preferences', data);
    return response.data?.data ?? response.data;
  },
};
