const stripe = require('stripe');

let stripeInstance = null;

async function getStripe() {
  if (stripeInstance) return stripeInstance;

  // Priority 1: Environment variable
  if (process.env.STRIPE_SECRET_KEY) {
    stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);
    return stripeInstance;
  }

  // Priority 2: Database settings
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    if (settings && settings.stripeEnabled && settings.stripeSecretKey) {
      stripeInstance = stripe(settings.stripeSecretKey);
      return stripeInstance;
    }
  } catch (err) {
    console.warn('Failed to load Stripe config from database:', err.message);
  }

  console.warn('STRIPE_SECRET_KEY not set and no DB config — Stripe payments disabled');
  return null;
}

module.exports = { getStripe };
const stripe = require('stripe');

let stripeInstance = null;

function getStripe() {
  if (stripeInstance) return stripeInstance;

  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY not set — Stripe payments disabled');
    return null;
  }

  stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);
  return stripeInstance;
}

module.exports = { getStripe };
