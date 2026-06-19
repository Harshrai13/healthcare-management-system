const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, default: null },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String },
    avatar: { type: String },
    address: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String },
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
    },
    googleId: { type: String, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    role: {
      type: String,
      enum: ['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'BILLING_STAFF', 'CONTENT_MANAGER', 'SUPER_ADMIN'],
      default: 'PATIENT',
      index: true,
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationOtp: { type: String },
    verificationOtpExpiry: { type: Date },
    resetOtp: { type: String },
    resetOtpExpiry: { type: Date },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsAlerts: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
