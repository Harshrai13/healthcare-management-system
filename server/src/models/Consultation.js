const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomUrl: { type: String, required: true },
    provider: { type: String, default: 'webrtc' },
    status: {
      type: String,
      enum: ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'WAITING',
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number }, // in minutes
    notes: { type: String },
    followUpDate: { type: Date },
  },
  { timestamps: true }
);

consultationSchema.index({ doctorId: 1, status: 1 });
consultationSchema.index({ patientId: 1 });
consultationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Consultation', consultationSchema);
