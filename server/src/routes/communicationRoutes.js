const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const communicationController = require('../controllers/communicationController');
const smsController = require('../controllers/smsController');
const emailTemplateController = require('../controllers/emailTemplateController');
const announcementController = require('../controllers/announcementController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Email Logs - Admin/Super Admin
router.get('/email-logs', authorize('ADMIN', 'SUPER_ADMIN'), communicationController.getEmailLogs);
router.get('/email-logs/:id', authorize('ADMIN', 'SUPER_ADMIN'), communicationController.getEmailLog);
router.post('/email-logs/:id/resend', authorize('ADMIN', 'SUPER_ADMIN'), communicationController.resendEmail);

// SMS Logs - Admin/Super Admin
router.get('/sms-logs', authorize('ADMIN', 'SUPER_ADMIN'), smsController.getSMSLogs);
router.get('/sms-logs/:id', authorize('ADMIN', 'SUPER_ADMIN'), smsController.getSMSLog);
router.post('/sms-logs/:id/resend', authorize('ADMIN', 'SUPER_ADMIN'), smsController.resendSMS);

// Email Settings / Provider Configuration - Admin/Super Admin
router.get('/email-settings', authorize('ADMIN', 'SUPER_ADMIN'), communicationController.getEmailSettings);
router.put('/email-settings', authorize('ADMIN', 'SUPER_ADMIN'), communicationController.updateEmailSettings);
router.put('/email-settings/api-key', authorize('SUPER_ADMIN'), communicationController.updateApiKey);
router.post('/email-settings/verify', authorize('ADMIN', 'SUPER_ADMIN'), communicationController.verifyConnection);
router.post('/email-settings/check-domain', authorize('ADMIN', 'SUPER_ADMIN'), communicationController.checkDomain);
router.post('/email-settings/toggle', authorize('ADMIN', 'SUPER_ADMIN'), communicationController.toggleEmailService);
router.post('/email-settings/test-email', authorize('ADMIN', 'SUPER_ADMIN'), communicationController.sendTestEmailHandler);

// Email Templates - Admin/Super Admin
router.get('/email-templates', authorize('ADMIN', 'SUPER_ADMIN'), emailTemplateController.getTemplates);
router.get('/email-templates/:id', authorize('ADMIN', 'SUPER_ADMIN'), emailTemplateController.getTemplate);
router.put('/email-templates/:id', authorize('ADMIN', 'SUPER_ADMIN'), emailTemplateController.updateTemplate);
router.post('/email-templates/:id/preview', authorize('ADMIN', 'SUPER_ADMIN'), emailTemplateController.previewTemplate);
router.post('/email-templates/:id/test', authorize('ADMIN', 'SUPER_ADMIN'), emailTemplateController.sendTestTemplate);

// Announcements - Admin/Super Admin
router.get('/announcements', authorize('ADMIN', 'SUPER_ADMIN'), announcementController.getAnnouncements);
router.get('/announcements/:id', authorize('ADMIN', 'SUPER_ADMIN'), announcementController.getAnnouncement);
router.post('/announcements', authorize('ADMIN', 'SUPER_ADMIN'), announcementController.createAnnouncement);
router.delete('/announcements/:id', authorize('ADMIN', 'SUPER_ADMIN'), announcementController.deleteAnnouncement);

// Analytics - Admin/Super Admin
router.get('/analytics/email', authorize('ADMIN', 'SUPER_ADMIN'), communicationController.getEmailAnalytics);
router.get('/analytics/sms', authorize('ADMIN', 'SUPER_ADMIN'), smsController.getSMSAnalytics);
router.get('/health', authorize('ADMIN', 'SUPER_ADMIN'), communicationController.getCommunicationHealth);

module.exports = router;
