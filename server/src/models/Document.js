const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String },
    fileType: { type: String, required: true },
    category: { type: String, default: 'GENERAL' },
  },
  { timestamps: true }
);

documentSchema.index({ patientId: 1, category: 1 });

module.exports = mongoose.model('Document', documentSchema);
