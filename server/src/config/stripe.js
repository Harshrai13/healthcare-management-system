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
