const Announcement = require('../models/Announcement');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { notifyClinicAnnouncement } = require('../utils/notificationService');
const logger = require('../utils/logger');

/**
 * Get all announcements
 */
async function getAnnouncements(req, res) {
  try {
    const { type, targetAudience, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (targetAudience) filter.targetAudience = targetAudience;

    const total = await Announcement.countDocuments(filter);
    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: announcements,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get announcements failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
}

/**
 * Get single announcement
 */
async function getAnnouncement(req, res) {
  try {
    const announcement = await Announcement.findById(req.params.id).populate('createdBy', 'firstName lastName email');
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });
    res.json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch announcement' });
  }
}

/**
 * Create and send announcement
 */
async function createAnnouncement(req, res) {
  try {
    const { title, message, type, targetAudience, channels } = req.body;

    const announcement = await Announcement.create({
      title,
      message,
      type,
      targetAudience,
      channels,
      createdBy: req.user._id,
    });

    // Build user query based on target audience
    const userFilter = {};
    if (targetAudience === 'patients') userFilter.role = 'PATIENT';
    if (targetAudience === 'doctors') userFilter.role = 'DOCTOR';

    const users = await User.find(userFilter);

    let emailSent = 0;
    let emailFailed = 0;
    let smsSent = 0;
    let smsFailed = 0;
    let inAppCreated = 0;

    if (channels?.inApp) {
      try {
        await notifyClinicAnnouncement(announcement, users);
        inAppCreated += users.length;
      } catch (err) {
        logger.error('In-app announcement failed', { error: err.message });
      }
    }

    if (channels?.email || channels?.sms) {
      for (const user of users) {
        if (channels?.email && user.email) {
          try {
            const { sendTemplateEmail } = require('../utils/emailService');
            await sendTemplateEmail(user.email, 'clinicAnnouncement', {
              patientName: `${user.firstName} ${user.lastName}`,
              announcementTitle: title,
              announcementBody: message,
            });
            emailSent += 1;
          } catch (err) {
            emailFailed += 1;
            logger.error('Announcement email failed', { userId: user._id, error: err.message });
          }
        }
        if (channels?.sms && user.phone) {
          try {
            const { sendSMS } = require('../config/twilio');
            await sendSMS(user.phone, `${title}: ${message} - VerdantCare`, {
              recipientType: user.role.toLowerCase(),
              recipientId: user._id,
            });
            smsSent += 1;
          } catch (err) {
            smsFailed += 1;
            logger.error('Announcement SMS failed', { userId: user._id, error: err.message });
          }
        }
      }
    }

    announcement.sentAt = new Date();
    announcement.deliveryStatus = { emailSent, emailFailed, smsSent, smsFailed, inAppCreated };
    await announcement.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'ANNOUNCEMENT_CREATED',
      entity: 'Announcement',
      entityId: announcement._id.toString(),
      newValue: { title, type, targetAudience, channels },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: announcement, message: 'Announcement created and sent' });
  } catch (error) {
    logger.error('Create announcement failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
}

/**
 * Delete announcement
 */
async function deleteAnnouncement(req, res) {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    await ActivityLog.create({
      userId: req.user._id,
      action: 'ANNOUNCEMENT_DELETED',
      entity: 'Announcement',
      entityId: announcement._id.toString(),
      oldValue: { title: announcement.title, message: announcement.message },
      ipAddress: req.ip,
    });

    await announcement.deleteOne();
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    logger.error('Delete announcement failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
}

module.exports = { getAnnouncements, getAnnouncement, createAnnouncement, deleteAnnouncement };
