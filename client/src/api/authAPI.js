import api from './axios';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyResetOTP: (data) => api.post('/auth/verify-reset-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  googleAuth: (credential) => api.post('/auth/google', { credential }),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  verify2FALogin: (data) => api.post('/auth/verify-2fa-login', data),
};

export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  changePassword: (data) => api.put('/users/change-password', data),
  setupTwoFactor: () => api.post('/users/two-factor/setup'),
  verifyTwoFactor: (token) => api.post('/users/two-factor/verify', { token }),
  disableTwoFactor: (password) => api.put('/users/two-factor/disable', { password }),
};
