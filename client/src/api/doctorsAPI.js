import api from './axios';

export const doctorsAPI = {
  getAll: (params) => api.get('/doctors', { params }),
  getById: (id) => api.get(`/doctors/${id}`),
  getProfile: () => api.get('/doctors/me'),
  getSchedule: (id) => api.get(`/doctors/${id}/schedule`),
  updateProfile: (id, data) => api.put(`/doctors/${id}/profile`, data),
};

export const servicesAPI = {
  getAll: () => api.get('/services'),
  getBySlug: (slug) => api.get(`/services/${slug}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};
