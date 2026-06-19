const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    medications: [{ type: String }],
    instructions: { type: String },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

prescriptionSchema.index({ patientId: 1, issuedAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
