const EmailLog = require('../models/EmailLog');
const EmailSettings = require('../models/EmailSettings');
const EmailTemplate = require('../models/EmailTemplate');
const ActivityLog = require('../models/ActivityLog');
const { sendTestEmail, sendTemplateEmail } = require('../utils/emailService');
const { verifyResendConnection, checkDomainVerification } = require('../config/resend');
const logger = require('../utils/logger');

/**
 * Get email logs with filtering and pagination
 */
async function getEmailLogs(req, res) {
  try {
    const { status, templateName, to, page = 1, limit = 20, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (templateName) filter.templateName = templateName;
    if (to) filter.to = { $regex: to, $options: 'i' };
    if (search) {
      filter.$or = [
        { to: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await EmailLog.countDocuments(filter);
    const logs = await EmailLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get email logs failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch email logs' });
  }
}

/**
 * Get single email log details
 */
async function getEmailLog(req, res) {
  try {
    const log = await EmailLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Email log not found' });
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch email log' });
  }
}

/**
 * Resend a failed email
 */
async function resendEmail(req, res) {
  try {
    const log = await EmailLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Email log not found' });

    // Increment retry count
    log.retryCount = (log.retryCount || 0) + 1;
    log.status = 'pending';
    await log.save();

    // Resend using the same template
    const result = await sendTemplateEmail(log.to, log.templateName, log.data);

    log.status = result.emailSent ? 'sent' : 'failed';
    log.errorMessage = result.error || null;
    log.messageId = result.messageId || null;
    log.sentAt = result.emailSent ? new Date() : null;
    await log.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'EMAIL_RESENT',
      entity: 'EmailLog',
      entityId: log._id.toString(),
      ipAddress: req.ip,
    });

    res.json({ success: true, data: log, message: result.emailSent ? 'Email resent successfully' : 'Email resend failed' });
  } catch (error) {
    logger.error('Resend email failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to resend email' });
  }
}

/**
 * Send test email
 */
async function sendTestEmailHandler(req, res) {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ success: false, message: 'Recipient email is required' });

    const result = await sendTestEmail(to);

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'TEST_EMAIL_SENT',
      entity: 'EmailSettings',
      newValue: { to },
      ipAddress: req.ip,
    });

    res.json({ success: result.emailSent, message: result.emailSent ? 'Test email sent successfully' : `Test email failed: ${result.error}` });
  } catch (error) {
    logger.error('Send test email failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to send test email' });
  }
}

/**
 * Get email settings (masked API key)
 */
async function getEmailSettings(req, res) {
  try {
    let settings = await EmailSettings.findOne();
    if (!settings) {
      settings = await EmailSettings.create({});
    }

    // Mask the API key for response
    const response = settings.toObject();
    if (response.resendApiKey) {
      const key = response.resendApiKey;
      response.resendApiKey = key.length > 8 ? `${'*'.repeat(key.length - 4)}${key.slice(-4)}` : '****';
    }

    res.json({ success: true, data: response });
  } catch (error) {
    logger.error('Get email settings failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch email settings' });
  }
}

/**
 * Update email settings (sender identity)
 */
async function updateEmailSettings(req, res) {
  try {
    const { senderName, senderEmail } = req.body;
    let settings = await EmailSettings.findOne();
    if (!settings) settings = new EmailSettings({});

    const oldValue = { senderName: settings.senderName, senderEmail: settings.senderEmail };

    if (senderName) settings.senderName = senderName;
    if (senderEmail) settings.senderEmail = senderEmail;

    await settings.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'EMAIL_SETTINGS_UPDATED',
      entity: 'EmailSettings',
      oldValue,
      newValue: { senderName, senderEmail },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: settings, message: 'Email settings updated' });
  } catch (error) {
    logger.error('Update email settings failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update email settings' });
  }
}

/**
 * Update Resend API key (SUPER_ADMIN only)
 */
async function updateApiKey(req, res) {
  try {
    const { resendApiKey } = req.body;
    if (!resendApiKey) return res.status(400).json({ success: false, message: 'API key is required' });

    let settings = await EmailSettings.findOne();
    if (!settings) settings = new EmailSettings({});

    settings.resendApiKey = resendApiKey;
    settings.verificationStatus = 'api_key_connected';
    await settings.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'API_KEY_UPDATED',
      entity: 'EmailSettings',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'API key updated successfully' });
  } catch (error) {
    logger.error('Update API key failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update API key' });
  }
}

/**
 * Verify Resend connection
 */
async function verifyConnection(req, res) {
  try {
    const result = await verifyResendConnection();

    if (result.verified) {
      const settings = await EmailSettings.findOne();
      if (settings) {
        settings.lastConnectionAt = new Date();
        settings.lastError = null;
        settings.verificationStatus = 'api_key_connected';
        await settings.save();
      }
    } else {
      const settings = await EmailSettings.findOne();
      if (settings) {
        settings.lastError = result.error;
        await settings.save();
      }
    }

    res.json({ success: result.verified, data: result });
  } catch (error) {
    logger.error('Verify connection failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to verify connection' });
  }
}

/**
 * Check domain verification status
 */
async function checkDomain(req, res) {
  try {
    const settings = await EmailSettings.findOne();
    if (!settings?.senderEmail) {
      return res.status(400).json({ success: false, message: 'Sender email not configured' });
    }

    const result = await checkDomainVerification(settings.senderEmail);

    if (result.verified && settings) {
      settings.domainVerified = true;
      settings.verificationStatus = 'domain_verified';
      await settings.save();
    }

    res.json({ success: result.verified, data: result });
  } catch (error) {
    logger.error('Check domain failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to check domain' });
  }
}

/**
 * Activate/deactivate email service
 */
async function toggleEmailService(req, res) {
  try {
    const { isEnabled } = req.body;
    const settings = await EmailSettings.findOne();
    if (!settings) return res.status(404).json({ success: false, message: 'Email settings not found' });

    settings.isEnabled = isEnabled;
    if (isEnabled) {
      settings.verificationStatus = 'fully_active';
    } else {
      settings.verificationStatus = 'api_key_connected';
    }
    await settings.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: isEnabled ? 'EMAIL_SERVICE_ACTIVATED' : 'EMAIL_SERVICE_DEACTIVATED',
      entity: 'EmailSettings',
      ipAddress: req.ip,
    });

    res.json({ success: true, data: settings, message: isEnabled ? 'Email service activated' : 'Email service deactivated' });
  } catch (error) {
    logger.error('Toggle email service failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to toggle email service' });
  }
}

/**
 * Get email analytics
 */
async function getEmailAnalytics(req, res) {
  try {
    const { period = 'week' } = req.query;

    const totalEmails = await EmailLog.countDocuments();
    const sentEmails = await EmailLog.countDocuments({ status: 'sent' });
    const failedEmails = await EmailLog.countDocuments({ status: 'failed' });
    const pendingEmails = await EmailLog.countDocuments({ status: 'pending' });
    const successRate = totalEmails > 0 ? ((sentEmails / totalEmails) * 100).toFixed(1) : 0;

    // Calculate date range
    const now = new Date();
    let startDate;
    if (period === 'day') startDate = new Date(now.setDate(now.getDate() - 1));
    else if (period === 'month') startDate = new Date(now.setMonth(now.getMonth() - 1));
    else startDate = new Date(now.setDate(now.getDate() - 7));

    // Daily volume for chart
    const dailyVolume = await EmailLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Template breakdown
    const templateBreakdown = await EmailLog.aggregate([
      { $match: { templateName: { $ne: null } } },
      { $group: { _id: '$templateName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        totalEmails,
        sentEmails,
        failedEmails,
        pendingEmails,
        successRate: `${successRate}%`,
        dailyVolume,
        templateBreakdown,
      },
    });
  } catch (error) {
    logger.error('Get email analytics failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch email analytics' });
  }
}

/**
 * Get communication health status
 */
async function getCommunicationHealth(req, res) {
  try {
    const settings = await EmailSettings.findOne();
    const { isTwilioConfigured } = require('../config/twilio');

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [lastEmail, lastSMS, failedEmails24h, failedSMS24h, pendingEmails, pendingSMS] = await Promise.all([
      EmailLog.findOne({ status: 'sent' }).sort({ sentAt: -1 }),
      require('../models/SMSLog').findOne({ status: 'sent' }).sort({ createdAt: -1 }),
      EmailLog.countDocuments({ status: 'failed', createdAt: { $gte: last24Hours } }),
      require('../models/SMSLog').countDocuments({ status: 'failed', createdAt: { $gte: last24Hours } }),
      EmailLog.countDocuments({ status: 'pending' }),
      require('../models/SMSLog').countDocuments({ status: 'pending' }),
    ]);

    const emailServiceOnline = settings?.isEnabled && settings?.resendApiKey;
    const smsServiceOnline = isTwilioConfigured();

    // Calculate health score
    let healthScore = 100;
    if (!emailServiceOnline) healthScore -= 30;
    if (!smsServiceOnline) healthScore -= 20;
    if (failedEmails24h > 10) healthScore -= 20;
    if (failedSMS24h > 5) healthScore -= 15;
    if (pendingEmails > 50) healthScore -= 10;
    healthScore = Math.max(0, healthScore);

    res.json({
      success: true,
      data: {
        emailService: { online: emailServiceOnline, lastSent: lastEmail?.sentAt },
        smsService: { online: smsServiceOnline, lastSent: lastSMS?.createdAt },
        failedEmails24h,
        failedSMS24h,
        pendingEmails,
        pendingSMS,
        healthScore: `${healthScore}%`,
      },
    });
  } catch (error) {
    logger.error('Get communication health failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch communication health' });
  }
}

module.exports = {
  getEmailLogs,
  getEmailLog,
  resendEmail,
  sendTestEmailHandler,
  getEmailSettings,
  updateEmailSettings,
  updateApiKey,
  verifyConnection,
  checkDomain,
  toggleEmailService,
  getEmailAnalytics,
  getCommunicationHealth,
};
