const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    gateway: { type: String, enum: ['stripe', 'razorpay', 'manual'], default: 'manual' },
    transactionId: { type: String },
    status: { type: String, default: 'COMPLETED' },
    razorpayPaymentId: { type: String },
    razorpayOrderId: { type: String },
    razorpaySignature: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
