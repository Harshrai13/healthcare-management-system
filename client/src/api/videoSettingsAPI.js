import api from './axios';

export const videoSettingsAPI = {
  get: () => api.get('/video-settings'),
  update: (data) => api.put('/video-settings', data),
  getIceServers: () => api.get('/video-settings/ice-servers'),
  getClientConfig: () => api.get('/video-settings/client-config'),
};
