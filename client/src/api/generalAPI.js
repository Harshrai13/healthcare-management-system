import api from './axios';

export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  processPayment: (id, data) => api.post(`/invoices/${id}/pay`, data),
  createPaymentIntent: (id) => api.post(`/invoices/${id}/payment-intent`),
  createRazorpayOrder: (id) => api.post(`/invoices/${id}/create-razorpay-order`),
  verifyRazorpayPayment: (id, data) => api.post(`/invoices/${id}/verify-razorpay-payment`, data),
  getPaymentHistory: (params) => api.get('/invoices/payments/history', { params }),
  downloadInvoicePDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  downloadReceiptPDF: (id) => api.get(`/invoices/receipt/${id}/pdf`, { responseType: 'blob' }),
};

export const reviewsAPI = {
  create: (data) => api.post('/reviews', data),
  getAll: (params) => api.get('/reviews', { params }),
  getDoctorReviews: (doctorId, params) => api.get(`/reviews/doctor/${doctorId}`, { params }),
  getAdminAll: (params) => api.get('/reviews/admin', { params }),
  approve: (id) => api.put(`/reviews/${id}/approve`),
  delete: (id) => api.delete(`/reviews/${id}`),
};

export const blogAPI = {
  getAll: (params) => api.get('/blog', { params }),
  getBySlug: (slug) => api.get(`/blog/${slug}`),
  getAdminAll: (params) => api.get('/blog/admin/all', { params }),
  create: (data) => api.post('/blog', data),
  update: (id, data) => api.put(`/blog/${id}`, data),
  delete: (id) => api.delete(`/blog/${id}`),
};

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  createDoctor: (data) => api.post('/admin/doctors', data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

export const consultationsAPI = {
  getAll: () => api.get('/consultations'),
  start: (appointmentId) => api.post(`/consultations/${appointmentId}/start`),
  getById: (id) => api.get(`/consultations/${id}`),
  complete: (id) => api.put(`/consultations/${id}/complete`),
};

// Public endpoints — no auth required (for homepage)
export const publicAPI = {
  getStats: () => api.get('/reviews/public/stats'),
  getFeaturedReviews: () => api.get('/reviews/public/featured'),
  submitContact: (data) => api.post('/public/contact', data),
  submitCareerApplication: (data) => api.post('/public/careers', data),
};

export const insuranceAPI = {
  getAll: (params) => api.get('/insurance', { params }),
  getById: (id) => api.get(`/insurance/${id}`),
  create: (data) => api.post('/insurance', data),
  update: (id, data) => api.put(`/insurance/${id}`, data),
  delete: (id) => api.delete(`/insurance/${id}`),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  uploadLogo: (formData) => api.post('/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
