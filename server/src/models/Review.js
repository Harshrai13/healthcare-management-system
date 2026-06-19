const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: false },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: false },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    isApproved: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ doctorId: 1, isApproved: 1 });
reviewSchema.index({ isApproved: 1 });

module.exports = mongoose.model('Review', reviewSchema);
