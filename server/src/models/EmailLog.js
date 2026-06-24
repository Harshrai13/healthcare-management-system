const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    templateName: { type: String, index: true },
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending'],
      default: 'pending',
      index: true,
    },
    errorMessage: { type: String },
    messageId: { type: String },
    data: { type: mongoose.Schema.Types.Mixed },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

emailLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
