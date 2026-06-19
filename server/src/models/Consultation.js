const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['WAITING', 'IN_PROGRESS', 'COMPLETED'],
      default: 'WAITING',
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    notes: { type: String },
    followUpDate: { type: Date },
  },
  { timestamps: true }
);

consultationSchema.index({ doctorId: 1, status: 1 });
consultationSchema.index({ patientId: 1 });

module.exports = mongoose.model('Consultation', consultationSchema);
