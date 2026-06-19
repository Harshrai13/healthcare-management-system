const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    clinicName: { type: String, default: 'VerdantCare Medical Center' },
    supportEmail: { type: String, default: 'support@verdantcare.com' },
    phone: { type: String, default: '+1 (800) 123-4567' },
    address: { type: String, default: '123 Medical Plaza, Suite 100' },
    timezone: { type: String, default: 'America/Los_Angeles' },
    currency: { type: String, default: 'INR' },
    language: { type: String, default: 'en' },
    twoFactorEnabled: { type: Boolean, default: false },
    sessionTimeout: { type: String, default: '30 minutes' },
    ipWhitelist: { type: Boolean, default: false },
    notificationPrefs: {
      newAppointments: { email: { type: Boolean, default: true }, push: { type: Boolean, default: false } },
      cancellations: { email: { type: Boolean, default: true }, push: { type: Boolean, default: false } },
      newPatients: { email: { type: Boolean, default: true }, push: { type: Boolean, default: false } },
      payments: { email: { type: Boolean, default: true }, push: { type: Boolean, default: true } },
      systemAlerts: { email: { type: Boolean, default: true }, push: { type: Boolean, default: true } },
    },
    paymentGateway: { type: String, default: 'razorpay' },
    invoiceDuePeriod: { type: String, default: '14 days' },
    logoUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
