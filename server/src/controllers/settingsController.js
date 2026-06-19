const Settings = require('../models/Settings');
const logger = require('../utils/logger');

async function getSettings(req, res, next) {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    const allowedFields = [
      'clinicName', 'supportEmail', 'phone', 'address', 'timezone',
      'currency', 'language', 'twoFactorEnabled', 'sessionTimeout',
      'ipWhitelist', 'notificationPrefs', 'paymentGateway',
      'invoiceDuePeriod', 'logoUrl',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    await settings.save();
    logger.info('Settings updated', { adminId: req.user.id });

    res.json({ success: true, message: 'Settings saved successfully.', data: settings });
  } catch (error) {
    next(error);
  }
}

module.exports = { getSettings, updateSettings };
