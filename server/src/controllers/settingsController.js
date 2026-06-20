const Settings = require('../models/Settings');
const logger = require('../utils/logger');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { AppError, ErrorCodes } = require('../utils/AppError');

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

async function uploadLogo(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded. Please select an image.', 400, ErrorCodes.VALIDATION_ERROR);
    }
    const result = await uploadToCloudinary(req.file.buffer, 'branding', 'image');
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ logoUrl: result.url });
    } else {
      if (settings.logoUrl) {
        const oldPublicId = settings.logoUrl.split('/').pop().split('.')[0];
        try { await deleteFromCloudinary(`verdantcare/branding/${oldPublicId}`); } catch (_) { /* ignore */ }
      }
      settings.logoUrl = result.url;
      await settings.save();
    }
    logger.info('Logo uploaded', { adminId: req.user.id });
    res.json({ success: true, message: 'Logo uploaded successfully.', data: { logoUrl: result.url } });
  } catch (error) { next(error); }
}

module.exports = { getSettings, updateSettings, uploadLogo };
