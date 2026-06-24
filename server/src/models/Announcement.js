const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['service', 'campaign', 'holiday', 'emergency'],
      required: true,
    },
    targetAudience: {
      type: String,
      enum: ['all', 'patients', 'doctors'],
      default: 'all',
    },
    channels: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: { type: Date },
    deliveryStatus: {
      emailSent: { type: Number, default: 0 },
      emailFailed: { type: Number, default: 0 },
      smsSent: { type: Number, default: 0 },
      smsFailed: { type: Number, default: 0 },
      inAppCreated: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

announcementSchema.index({ type: 1 });
announcementSchema.index({ targetAudience: 1 });
announcementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
