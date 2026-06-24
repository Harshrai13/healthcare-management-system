import api from './axios';

// Email Logs
export const getEmailLogs = (params) => api.get('/communication/email-logs', { params });
export const getEmailLog = (id) => api.get(`/communication/email-logs/${id}`);
export const resendEmail = (id) => api.post(`/communication/email-logs/${id}/resend`);

// SMS Logs
export const getSMSLogs = (params) => api.get('/communication/sms-logs', { params });
export const getSMSLog = (id) => api.get(`/communication/sms-logs/${id}`);
export const resendSMS = (id) => api.post(`/communication/sms-logs/${id}/resend`);

// Email Settings / Provider Configuration
export const getEmailSettings = () => api.get('/communication/email-settings');
export const updateEmailSettings = (data) => api.put('/communication/email-settings', data);
export const updateApiKey = (data) => api.put('/communication/email-settings/api-key', data);
export const verifyEmailConnection = () => api.post('/communication/email-settings/verify');
export const checkEmailDomain = () => api.post('/communication/email-settings/check-domain');
export const toggleEmailService = (data) => api.post('/communication/email-settings/toggle', data);
export const sendTestEmail = (data) => api.post('/communication/email-settings/test-email', data);

// Email Templates
export const getEmailTemplates = (params) => api.get('/communication/email-templates', { params });
export const getEmailTemplate = (id) => api.get(`/communication/email-templates/${id}`);
export const updateEmailTemplate = (id, data) => api.put(`/communication/email-templates/${id}`, data);
export const previewEmailTemplate = (id, data) => api.post(`/communication/email-templates/${id}/preview`, data);
export const sendTestTemplate = (id, data) => api.post(`/communication/email-templates/${id}/test`, data);

// Announcements
export const getAnnouncements = (params) => api.get('/communication/announcements', { params });
export const getAnnouncement = (id) => api.get(`/communication/announcements/${id}`);
export const createAnnouncement = (data) => api.post('/communication/announcements', data);
export const deleteAnnouncement = (id) => api.delete(`/communication/announcements/${id}`);

// Analytics
export const getEmailAnalytics = (params) => api.get('/communication/analytics/email', { params });
export const getSMSAnalytics = (params) => api.get('/communication/analytics/sms', { params });
export const getCommunicationHealth = () => api.get('/communication/health');
