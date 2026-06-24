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
      'razorpayKeyId', 'razorpayKeySecret', 'razorpayWebhookSecret', 'razorpayEnabled',
      'stripePublishableKey', 'stripeSecretKey', 'stripeWebhookSecret', 'stripeEnabled',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    // Auto-clear footer fields if they match old defaults — let them fall back to Contact fields
    const oldDefaults = {
      footerAddress: '123 Healthcare Ave, Suite 100\nSouth Carolina, SC 29601',
      footerPhone: '+1 (800) 123-4567',
      footerEmail: 'info@verdantcare.com',
      footerWeekdayHours: 'Mon-Fri: 9am - 6pm',
      footerWeekendHours: 'Sat: 9am - 2pm',
    };
    Object.entries(oldDefaults).forEach(([field, defaultVal]) => {
      if (settings[field] === defaultVal) {
        settings[field] = undefined;
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

module.exports = { getSettings, getPublicSettings, updateSettings, uploadLogo, getPaymentConfig, verifyPaymentGateway };

async function getPaymentConfig(req, res, next) {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});

    const maskSecret = (val) => {
      if (!val || val.length <= 4) return '****';
      return '****' + val.slice(-4);
    };

    res.json({
      success: true,
      data: {
        razorpay: {
          enabled: settings.razorpayEnabled || false,
          keyId: settings.razorpayKeyId || '',
          keySecret: maskSecret(settings.razorpayKeySecret),
          webhookSecret: maskSecret(settings.razorpayWebhookSecret),
        },
        stripe: {
          enabled: settings.stripeEnabled || false,
          publishableKey: settings.stripePublishableKey || '',
          secretKey: maskSecret(settings.stripeSecretKey),
          webhookSecret: maskSecret(settings.stripeWebhookSecret),
        },
      },
    });
  } catch (error) { next(error); }
}

async function verifyPaymentGateway(req, res, next) {
  try {
    const { gateway, keyId, keySecret, publishableKey, secretKey } = req.body;

    if (gateway === 'razorpay') {
      if (!keyId || !keySecret) {
        return res.json({ success: false, message: 'Razorpay Key ID and Key Secret are required' });
      }
      const Razorpay = require('razorpay');
      const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
      // Test by fetching payments (lightweight call)
      await instance.payments.fetch({ count: 1 });
      logger.info('Razorpay connection verified', { adminId: req.user.id });
      return res.json({ success: true, message: 'Razorpay connection verified successfully' });
    }

    if (gateway === 'stripe') {
      if (!secretKey) {
        return res.json({ success: false, message: 'Stripe Secret Key is required' });
      }
      const stripe = require('stripe')(secretKey);
      // Test by fetching balance (lightweight call)
      await stripe.balance.retrieve();
      logger.info('Stripe connection verified', { adminId: req.user.id });
      return res.json({ success: true, message: 'Stripe connection verified successfully' });
    }

    return res.status(400).json({ success: false, message: 'Invalid gateway specified' });
  } catch (error) {
    logger.error('Payment gateway verification failed', { error: error.message, gateway: req.body.gateway });
    return res.json({ success: false, message: `Connection failed: ${error.message}` });
  }
}
