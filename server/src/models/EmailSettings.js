const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'verdantcare-2026-encryption-key-32'; // 32 chars for AES-256
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
}

const emailSettingsSchema = new mongoose.Schema(
  {
    senderName: { type: String, default: 'VerdantCare Medical Center' },
    senderEmail: { type: String, default: 'noreply@verdantcare.com' },
    resendApiKey: { type: String, default: null },
    isEnabled: { type: Boolean, default: false },
    provider: { type: String, default: 'resend' },
    domainVerified: { type: Boolean, default: false },
    senderVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['not_configured', 'api_key_connected', 'domain_verified', 'sender_verified', 'fully_active'],
      default: 'not_configured',
    },
    lastConnectionAt: { type: Date },
    lastError: { type: String },
    // SMTP settings
    smtpEnabled: { type: Boolean, default: false },
    smtpHost: { type: String, default: null },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: null },
    smtpPass: { type: String, default: null }, // encrypted
  },
  { timestamps: true }
);

// Pre-save hook: encrypt API key and SMTP password before saving
emailSettingsSchema.pre('save', function (next) {
  if (this.isModified('resendApiKey') && this.resendApiKey) {
    this.resendApiKey = encrypt(this.resendApiKey);
  }
  if (this.isModified('smtpPass') && this.smtpPass) {
    this.smtpPass = encrypt(this.smtpPass);
  }
  next();
});

// Method to decrypt the API key
emailSettingsSchema.methods.getDecryptedKey = function () {
  return decrypt(this.resendApiKey);
};

// Method to decrypt SMTP password
emailSettingsSchema.methods.getDecryptedSmtpPass = function () {
  return decrypt(this.smtpPass);
};

// Static method to get decrypted key directly
emailSettingsSchema.statics.getDecryptedApiKey = async function () {
  const settings = await this.findOne();
  if (!settings || !settings.resendApiKey) return null;
  return decrypt(settings.resendApiKey);
};

// Static method to get SMTP config
emailSettingsSchema.statics.getSmtpConfig = async function () {
  const settings = await this.findOne();
  if (!settings || !settings.smtpEnabled || !settings.smtpHost || !settings.smtpUser) return null;
  return {
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: (settings.smtpPort || 587) === 465,
    user: settings.smtpUser,
    pass: decrypt(settings.smtpPass),
    senderEmail: settings.senderEmail || 'noreply@verdantcare.com',
    senderName: settings.senderName || 'VerdantCare Medical Center',
  };
};

// Static method to get sender identity
emailSettingsSchema.statics.getSenderIdentity = async function () {
  const settings = await this.findOne();
  return {
    senderName: settings?.senderName || 'VerdantCare Medical Center',
    senderEmail: settings?.senderEmail || 'noreply@verdantcare.com',
  };
};

module.exports = mongoose.model('EmailSettings', emailSettingsSchema);
