const SMSLog = require('../models/SMSLog');
const ActivityLog = require('../models/ActivityLog');
const { sendSMS } = require('../config/twilio');
const logger = require('../utils/logger');

/**
 * Get SMS logs with filtering and pagination
 */
async function getSMSLogs(req, res) {
  try {
    const { status, recipientType, to, page = 1, limit = 20, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (recipientType) filter.recipientType = recipientType;
    if (to) filter.to = { $regex: to, $options: 'i' };
    if (search) {
      filter.$or = [
        { to: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await SMSLog.countDocuments(filter);
    const logs = await SMSLog.find(filter)
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
    logger.error('Get SMS logs failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch SMS logs' });
  }
}

/**
 * Get single SMS log details
 */
async function getSMSLog(req, res) {
  try {
    const log = await SMSLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'SMS log not found' });
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch SMS log' });
  }
}

/**
 * Resend a failed SMS
 */
async function resendSMS(req, res) {
  try {
    const log = await SMSLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'SMS log not found' });

    log.status = 'pending';
    await log.save();

    try {
      await sendSMS(log.to, log.body, {
        recipientType: log.recipientType,
        recipientId: log.recipientId,
      });
      log.status = 'sent';
      await log.save();

      await ActivityLog.create({
        userId: req.user._id,
        action: 'SMS_RESENT',
        entity: 'SMSLog',
        entityId: log._id.toString(),
        ipAddress: req.ip,
      });

      res.json({ success: true, data: log, message: 'SMS resent successfully' });
    } catch (sendErr) {
      log.status = 'failed';
      log.errorMessage = sendErr.message;
      await log.save();
      res.json({ success: false, data: log, message: `SMS resend failed: ${sendErr.message}` });
    }
  } catch (error) {
    logger.error('Resend SMS failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to resend SMS' });
  }
}

/**
 * Get SMS analytics
 */
async function getSMSAnalytics(req, res) {
  try {
    const { period = 'week' } = req.query;

    const totalSMS = await SMSLog.countDocuments();
    const sentSMS = await SMSLog.countDocuments({ status: 'sent' });
    const failedSMS = await SMSLog.countDocuments({ status: 'failed' });
    const pendingSMS = await SMSLog.countDocuments({ status: 'pending' });
    const deliveryRate = totalSMS > 0 ? ((sentSMS / totalSMS) * 100).toFixed(1) : 0;

    // Calculate date range
    const now = new Date();
    let startDate;
    if (period === 'day') startDate = new Date(now.setDate(now.getDate() - 1));
    else if (period === 'month') startDate = new Date(now.setMonth(now.getMonth() - 1));
    else startDate = new Date(now.setDate(now.getDate() - 7));

    // Daily volume for chart
    const dailyVolume = await SMSLog.aggregate([
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

    res.json({
      success: true,
      data: {
        totalSMS,
        sentSMS,
        failedSMS,
        pendingSMS,
        deliveryRate: `${deliveryRate}%`,
        dailyVolume,
      },
    });
  } catch (error) {
    logger.error('Get SMS analytics failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch SMS analytics' });
  }
}

module.exports = { getSMSLogs, getSMSLog, resendSMS, getSMSAnalytics };
