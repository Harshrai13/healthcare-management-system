const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    items: [{ type: mongoose.Schema.Types.Mixed }],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    paidAt: { type: Date },
    dueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ patientId: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
