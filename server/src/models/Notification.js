const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'APPOINTMENT_CONFIRMED',
        'APPOINTMENT_APPROVED',
        'APPOINTMENT_REJECTED',
        'APPOINTMENT_REMINDER',
        'APPOINTMENT_CANCELLED',
        'APPOINTMENT_RESCHEDULED',
        'CONSULTATION_REMINDER',
        'CONSULTATION_COMPLETE',
        'PRESCRIPTION_ISSUED',
        'PRESCRIPTION_UPDATED',
        'INVOICE_GENERATED',
        'PAYMENT_SUCCESS',
        'PAYMENT_FAILED',
        'PAYMENT_REMINDER',
        'RECEIPT_GENERATED',
        'FOLLOWUP_SCHEDULED',
        'FOLLOWUP_REMINDER',
        'BILLING_REMINDER',
        'REVIEW_REQUEST',
        'GENERAL_ANNOUNCEMENT',
        'CLINIC_ANNOUNCEMENT',
        'TELEHEALTH_REMINDER',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
