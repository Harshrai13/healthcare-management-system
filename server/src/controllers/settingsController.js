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

async function getPublicSettings(req, res, next) {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    // Only return public-facing fields
    const publicData = {
      clinicName: settings.clinicName,
      tagline: settings.tagline,
      supportEmail: settings.supportEmail,
      infoEmail: settings.infoEmail,
      appointmentsEmail: settings.appointmentsEmail,
      phone: settings.phone,
      emergencyPhone: settings.emergencyPhone,
      address: settings.address,
      weekdayHours: settings.weekdayHours,
      saturdayHours: settings.saturdayHours,
      sundayHours: settings.sundayHours,
      footerAddress: settings.footerAddress,
      footerPhone: settings.footerPhone,
      footerEmail: settings.footerEmail,
      footerWeekdayHours: settings.footerWeekdayHours,
      footerWeekendHours: settings.footerWeekendHours,
      facebookUrl: settings.facebookUrl,
      twitterUrl: settings.twitterUrl,
      instagramUrl: settings.instagramUrl,
      linkedinUrl: settings.linkedinUrl,
      logoUrl: settings.logoUrl,
    };
    res.json({ success: true, data: publicData });
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
      'clinicName', 'tagline', 'supportEmail', 'infoEmail', 'appointmentsEmail',
      'phone', 'emergencyPhone', 'address',
      'weekdayHours', 'saturdayHours', 'sundayHours',
      'footerAddress', 'footerPhone', 'footerEmail', 'footerWeekdayHours', 'footerWeekendHours',
      'facebookUrl', 'twitterUrl', 'instagramUrl', 'linkedinUrl',
      'timezone', 'currency', 'language', 'twoFactorEnabled', 'sessionTimeout',
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

module.exports = { getSettings, getPublicSettings, updateSettings, uploadLogo };
