const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true, index: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String },
    consultationType: { type: String, enum: ['IN_PERSON', 'VIDEO'], default: 'IN_PERSON' },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'],
      default: 'PENDING',
      index: true,
    },
    notes: { type: String },
    cancellationReason: { type: String },
    isFollowUp: { type: Boolean, default: false },
    reminderSent24h: { type: Boolean, default: false },
    reminderSent1h: { type: Boolean, default: false },
  },
  { timestamps: true }
);

appointmentSchema.index({ doctorId: 1, date: 1, startTime: 1 }, { unique: true });
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
