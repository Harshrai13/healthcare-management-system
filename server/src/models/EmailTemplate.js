const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true },
    htmlBody: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['account', 'appointment', 'consultation', 'prescription', 'billing', 'followup', 'announcement'],
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);


module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
