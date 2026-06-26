const Razorpay = require('razorpay');

/**
 * Get Razorpay instance â€” always fresh, no caching.
 * Priority: MongoDB settings â†’ Environment variables â†’ null
 */
async function getRazorpay() {
  // Priority 1: Database settings (admin-configurable, no restart needed)
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    if (settings && settings.razorpayEnabled && settings.razorpayKeyId && settings.razorpayKeySecret) {
      return new Razorpay({
        key_id: settings.razorpayKeyId,
        key_secret: settings.razorpayKeySecret,
      });
    }
  } catch (err) {
    console.warn('Failed to load Razorpay config from database:', err.message);
  }

  // Priority 2: Environment variables (fallback for initial setup)
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  return null;
}

/**
 * Get Razorpay key ID for frontend checkout (used in order response).
 * Returns the active key from DB or env.
 */
async function getRazorpayKeyId() {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    if (settings?.razorpayEnabled && settings.razorpayKeyId) {
      return settings.razorpayKeyId;
    }
  } catch (err) {
    // fallback to env
  }
  return process.env.RAZORPAY_KEY_ID || '';
}

/**
 * Get Razorpay key secret for signature verification.
 * Returns the active secret from DB or env.
 */
async function getRazorpayKeySecret() {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    if (settings?.razorpayEnabled && settings.razorpayKeySecret) {
      return settings.razorpayKeySecret;
    }
  } catch (err) {
    // fallback to env
  }
  return process.env.RAZORPAY_KEY_SECRET || '';
}

/**
 * Get Razorpay webhook secret.
 * Returns the active secret from DB or env.
 */
async function getRazorpayWebhookSecret() {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    if (settings?.razorpayWebhookSecret) {
      return settings.razorpayWebhookSecret;
    }
  } catch (err) {
    // fallback to env
  }
  return process.env.RAZORPAY_WEBHOOK_SECRET || '';
}

module.exports = { getRazorpay, getRazorpayKeyId, getRazorpayKeySecret, getRazorpayWebhookSecret };
