const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'verdantcare-2026-encryption-key-32';
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
  } catch { return null; }
}

const videoSettingsSchema = new mongoose.Schema(
  {
    // ── General ───────────────────────────────────────────────────────
    enabled: { type: Boolean, default: true },
    provider: {
      type: String,
      enum: ['webrtc', 'livekit', 'twilio', 'agora'],
      default: 'webrtc',
    },

    // ── STUN / TURN ──────────────────────────────────────────────────
    stunServers: [{
      urls: { type: String, required: true },
    }],
    turnServerUrl: { type: String, default: null },
    turnUsername: { type: String, default: null },
    turnPassword: { type: String, default: null }, // encrypted

    // ── Provider-specific credentials (for LiveKit / Twilio / Agora) ─
    providerApiKey: { type: String, default: null },     // encrypted
    providerApiSecret: { type: String, default: null },  // encrypted
    providerAppId: { type: String, default: null },
    providerRegion: { type: String, default: null },

    // ── Features ─────────────────────────────────────────────────────
    allowScreenSharing: { type: Boolean, default: true },
    allowRecording: { type: Boolean, default: false },
    waitingRoom: { type: Boolean, default: true },
    consultationNotesEnabled: { type: Boolean, default: true },

    // ── Timing ───────────────────────────────────────────────────────
    autoEndConsultation: { type: Boolean, default: false },
    maximumDuration: { type: Number, default: 60 }, // minutes
    reminderBeforeMinutes: { type: Number, default: 15 },

    // ── Notifications ────────────────────────────────────────────────
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: false },

    // ── Media defaults ───────────────────────────────────────────────
    defaultVideoQuality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    startWithMutedMic: { type: Boolean, default: false },
    startWithMutedCamera: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Pre-save: encrypt sensitive fields ──────────────────────────────────
videoSettingsSchema.pre('save', function (next) {
  if (this.isModified('turnPassword') && this.turnPassword) {
    this.turnPassword = encrypt(this.turnPassword);
  }
  if (this.isModified('providerApiKey') && this.providerApiKey) {
    this.providerApiKey = encrypt(this.providerApiKey);
  }
  if (this.isModified('providerApiSecret') && this.providerApiSecret) {
    this.providerApiSecret = encrypt(this.providerApiSecret);
  }
  next();
});

// ── Instance methods ────────────────────────────────────────────────────
videoSettingsSchema.methods.getDecryptedTurnPassword = function () {
  return decrypt(this.turnPassword);
};

videoSettingsSchema.methods.getDecryptedProviderApiKey = function () {
  return decrypt(this.providerApiKey);
};

videoSettingsSchema.methods.getDecryptedProviderApiSecret = function () {
  return decrypt(this.providerApiSecret);
};

// ── Static helpers ──────────────────────────────────────────────────────

/**
 * Get the full video settings document (singleton).
 * Creates a default one if none exists.
 */
videoSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      stunServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
  }
  return settings;
};

/**
 * Get ICE server configuration dynamically from DB.
 * Returns array suitable for RTCPeerConnection iceServers option.
 */
videoSettingsSchema.statics.getIceServers = async function () {
  const settings = await this.getSettings();
  const iceServers = [];

  // STUN servers
  if (settings.stunServers && settings.stunServers.length > 0) {
    settings.stunServers.forEach(s => {
      if (s.urls) iceServers.push({ urls: s.urls });
    });
  } else {
    // Fallback defaults
    iceServers.push({ urls: 'stun:stun.l.google.com:19302' });
    iceServers.push({ urls: 'stun:stun1.l.google.com:19302' });
  }

  // TURN server (if configured)
  if (settings.turnServerUrl) {
    const turnConfig = { urls: settings.turnServerUrl };
    if (settings.turnUsername) {
      turnConfig.username = settings.turnUsername;
      turnConfig.credential = decrypt(settings.turnPassword) || '';
    }
    iceServers.push(turnConfig);
  }

  return iceServers;
};

/**
 * Check if video consultations are enabled.
 */
videoSettingsSchema.statics.isEnabled = async function () {
  const settings = await this.getSettings();
  return settings.enabled === true;
};

/**
 * Get video quality constraints based on settings.
 */
videoSettingsSchema.statics.getMediaConstraints = async function () {
  const settings = await this.getSettings();
  const qualityMap = {
    low: { width: 320, height: 240, frameRate: 15 },
    medium: { width: 640, height: 480, frameRate: 30 },
    high: { width: 1280, height: 720, frameRate: 30 },
  };
  const video = qualityMap[settings.defaultVideoQuality] || qualityMap.medium;
  return {
    audio: true,
    video,
  };
};

module.exports = mongoose.model('VideoSettings', videoSettingsSchema);
