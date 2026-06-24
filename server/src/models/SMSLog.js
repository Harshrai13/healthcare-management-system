const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, index: true },
    body: { type: String, required: true },
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending'],
      default: 'pending',
      index: true,
    },
    errorMessage: { type: String },
    providerMessageId: { type: String },
    recipientType: { type: String, enum: ['patient', 'doctor', 'admin', 'other'] },
    recipientId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

smsLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SMSLog', smsLogSchema);
