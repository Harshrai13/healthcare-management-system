const Razorpay = require('razorpay');

let razorpayInstance = null;

async function getRazorpay() {
  if (razorpayInstance) return razorpayInstance;

  // Priority 1: Environment variables
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    return razorpayInstance;
  }

  // Priority 2: Database settings
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    if (settings && settings.razorpayEnabled && settings.razorpayKeyId && settings.razorpayKeySecret) {
      razorpayInstance = new Razorpay({
        key_id: settings.razorpayKeyId,
        key_secret: settings.razorpayKeySecret,
      });
      return razorpayInstance;
    }
  } catch (err) {
    console.warn('Failed to load Razorpay config from database:', err.message);
  }

  return null;
}

module.exports = { getRazorpay };
const Razorpay = require('razorpay');

let razorpayInstance = null;

function getRazorpay() {
  if (razorpayInstance) return razorpayInstance;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  return razorpayInstance;
}

module.exports = { getRazorpay };
