const mongoose = require('mongoose');

const appointmentWaitlistSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    preferredDates: [{ type: Date }],
    notifiedAt: { type: Date },
  },
  { timestamps: true }
);

appointmentWaitlistSchema.index({ doctorId: 1, createdAt: 1 });

module.exports = mongoose.model('AppointmentWaitlist', appointmentWaitlistSchema);
