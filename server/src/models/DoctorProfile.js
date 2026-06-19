const mongoose = require('mongoose');

const doctorScheduleSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  slotDuration: { type: Number, default: 30 },
  isAvailable: { type: Boolean, default: true },
});

const doctorTimeOffSchema = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String },
});

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialty: { type: String, required: true, index: true },
    bio: { type: String },
    education: { type: String },
    certifications: [{ type: String }],
    languages: [{ type: String, default: 'English' }],
    gender: { type: String },
    experienceYears: { type: Number, default: 0 },
    consultationModes: [{ type: String, enum: ['IN_PERSON', 'VIDEO'], default: 'IN_PERSON' }],
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true, index: true },
    schedules: [doctorScheduleSchema],
    timeOffs: [doctorTimeOffSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
