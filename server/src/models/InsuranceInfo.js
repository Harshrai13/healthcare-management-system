const mongoose = require('mongoose');

const insuranceInfoSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, required: true },
    policyNumber: { type: String, required: true },
    policyHolderName: { type: String, required: true },
    relationship: { type: String, enum: ['Self', 'Spouse', 'Child', 'Parent', 'Other'], default: 'Self' },
    groupNumber: { type: String },
    effectiveDate: { type: Date },
    expiryDate: { type: Date },
    coverageType: { type: String, enum: ['Individual', 'Family', 'Group'], default: 'Individual' },
    claimStatus: { type: String, enum: ['Active', 'Expired', 'Pending', 'Approved', 'Rejected'], default: 'Active' },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InsuranceInfo', insuranceInfoSchema);
