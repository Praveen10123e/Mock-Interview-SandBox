import api from './axios/instance';

export const authApi = {
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },
  deleteAccount: async () => {
    const response = await api.delete('/auth/account');
    return response.data;
  },
  sendPasswordResetOtp: async (email: string) => {
    const response = await api.post('/auth/forgot-password/send-otp', { email });
    return response.data;
  },
  verifyPasswordResetOtp: async (email: string, otp: string) => {
    const response = await api.post('/auth/forgot-password/verify-otp', { email, otp });
    return response.data;
  },
  resetPasswordWithToken: async (data: {
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    const response = await api.post('/auth/forgot-password/reset-password', data);
    return response.data;
  },
};
