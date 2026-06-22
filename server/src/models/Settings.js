const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // General
    clinicName: { type: String, default: 'VerdantCare Medical Center' },
    tagline: { type: String, default: 'Premium healthcare services combining expert medical care with compassionate patient experience.' },

    // Contact
    supportEmail: { type: String, default: 'support@verdantcare.com' },
    infoEmail: { type: String, default: 'info@verdantcare.com' },
    appointmentsEmail: { type: String, default: 'appointments@verdantcare.com' },
    phone: { type: String, default: '+1 (800) 123-4567' },
    emergencyPhone: { type: String, default: '+1 (800) 123-4568' },
    address: { type: String, default: '123 Healthcare Ave, Suite 100, South Carolina, SC 29601' },

    // Hours
    weekdayHours: { type: String, default: 'Mon-Fri: 9:00 AM - 6:00 PM' },
    saturdayHours: { type: String, default: 'Sat: 9:00 AM - 2:00 PM' },
    sundayHours: { type: String, default: 'Sun: Closed' },

    // Footer-specific
    footerAddress: { type: String, default: '123 Healthcare Ave, Suite 100\nSouth Carolina, SC 29601' },
    footerPhone: { type: String, default: '+1 (800) 123-4567' },
    footerEmail: { type: String, default: 'info@verdantcare.com' },
    footerWeekdayHours: { type: String, default: 'Mon-Fri: 9am - 6pm' },
    footerWeekendHours: { type: String, default: 'Sat: 9am - 2pm' },

    // Social
    facebookUrl: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
    instagramUrl: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },

    // System
    timezone: { type: String, default: 'America/New_York' },
    currency: { type: String, default: 'USD' },
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
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // General
    clinicName: { type: String, default: 'VerdantCare Medical Center' },
    tagline: { type: String, default: 'Premium healthcare services combining expert medical care with compassionate patient experience.' },

    // Contact
    supportEmail: { type: String, default: 'support@verdantcare.com' },
    infoEmail: { type: String, default: 'info@verdantcare.com' },
    appointmentsEmail: { type: String, default: 'appointments@verdantcare.com' },
    phone: { type: String, default: '+1 (800) 123-4567' },
    emergencyPhone: { type: String, default: '+1 (800) 123-4568' },
    address: { type: String, default: '123 Healthcare Ave, Suite 100, South Carolina, SC 29601' },

    // Hours
    weekdayHours: { type: String, default: 'Mon-Fri: 9:00 AM - 6:00 PM' },
    saturdayHours: { type: String, default: 'Sat: 9:00 AM - 2:00 PM' },
    sundayHours: { type: String, default: 'Sun: Closed' },

    // Footer-specific
    footerAddress: { type: String, default: '123 Healthcare Ave, Suite 100\nSouth Carolina, SC 29601' },
    footerPhone: { type: String, default: '+1 (800) 123-4567' },
    footerEmail: { type: String, default: 'info@verdantcare.com' },
    footerWeekdayHours: { type: String, default: 'Mon-Fri: 9am - 6pm' },
    footerWeekendHours: { type: String, default: 'Sat: 9am - 2pm' },

    // Social
    facebookUrl: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
    instagramUrl: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },

    // System
    timezone: { type: String, default: 'America/New_York' },
    currency: { type: String, default: 'USD' },
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
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // General
    clinicName: { type: String, default: 'VerdantCare Medical Center' },
    tagline: { type: String, default: 'Premium healthcare services combining expert medical care with compassionate patient experience.' },

    // Contact
    supportEmail: { type: String, default: 'support@verdantcare.com' },
    infoEmail: { type: String, default: 'info@verdantcare.com' },
    appointmentsEmail: { type: String, default: 'appointments@verdantcare.com' },
    phone: { type: String, default: '+1 (800) 123-4567' },
    emergencyPhone: { type: String, default: '+1 (800) 123-4568' },
    address: { type: String, default: '123 Healthcare Ave, Suite 100, South Carolina, SC 29601' },

    // Hours
    weekdayHours: { type: String, default: 'Mon-Fri: 9:00 AM - 6:00 PM' },
    saturdayHours: { type: String, default: 'Sat: 9:00 AM - 2:00 PM' },
    sundayHours: { type: String, default: 'Sun: Closed' },

    // Footer-specific
    footerAddress: { type: String, default: '123 Healthcare Ave, Suite 100\nSouth Carolina, SC 29601' },
    footerPhone: { type: String, default: '+1 (800) 123-4567' },
    footerEmail: { type: String, default: 'info@verdantcare.com' },
    footerWeekdayHours: { type: String, default: 'Mon-Fri: 9am - 6pm' },
    footerWeekendHours: { type: String, default: 'Sat: 9am - 2pm' },

    // Social
    facebookUrl: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
    instagramUrl: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },

    // System
    timezone: { type: String, default: 'America/New_York' },
    currency: { type: String, default: 'USD' },
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
