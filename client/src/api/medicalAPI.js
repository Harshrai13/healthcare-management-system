import api from './axios';

export const recordsAPI = {
  getAll: (params) => api.get('/records', { params }),
  getById: (id) => api.get(`/records/${id}`),
  create: (data) => api.post('/records', data),
};

export const prescriptionsAPI = {
  getAll: (params) => api.get('/prescriptions', { params }),
  getById: (id) => api.get(`/prescriptions/${id}`),
  create: (data) => api.post('/prescriptions', data),
};

export const documentsAPI = {
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: (params) => api.get('/documents', { params }),
  delete: (id) => api.delete(`/documents/${id}`),
};
