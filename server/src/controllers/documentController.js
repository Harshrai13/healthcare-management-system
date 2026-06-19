const { Document } = require('../models');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { AppError, ErrorCodes } = require('../utils/AppError');

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const { category } = req.body;
    const result = await uploadToCloudinary(req.file.buffer, 'documents', 'raw');

    const document = await Document.create({
      patientId: req.user.role === 'PATIENT' ? req.user.id : req.body.patientId,
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      fileUrl: result.url,
      fileType: req.file.mimetype,
      category: category || 'GENERAL',
    });

    res.status(201).json({ success: true, message: 'Document uploaded successfully.', data: document });
  } catch (error) {
    next(error);
  }
}

async function getDocuments(req, res, next) {
  try {
    const { patientId, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (req.user.role === 'PATIENT') {
      where.patientId = req.user.id;
    } else if (patientId) {
      where.patientId = patientId;
    }

    const [documents, total] = await Promise.all([
      Document.find(where)
        .populate({ path: 'patientId', select: 'firstName lastName' })
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      Document.countDocuments(where),
    ]);

    res.json({
      success: true,
      data: {
        documents,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      throw new AppError('Document not found.', 404, ErrorCodes.NOT_FOUND);
    }

    await deleteFromCloudinary(document.publicId);
    await Document.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadDocument, getDocuments, deleteDocument };
