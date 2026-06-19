import api from './axios';

export const appointmentsAPI = {
  create: (data) => api.post('/appointments', data),
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  cancel: (id) => api.put(`/appointments/${id}/cancel`),
  reschedule: (id, data) => api.post(`/appointments/${id}/reschedule`, data),
  joinWaitlist: (data) => api.post('/appointments/waitlist', data),
};
