const multer = require('multer');
const { AppError } = require('../utils/AppError');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Allowed types: JPEG, PNG, WebP, PDF, DOC, DOCX.', 400, 'VALIDATION_ERROR'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});

function handleUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 10MB.', 400, 'VALIDATION_ERROR'));
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files. Maximum is 5 files per upload.', 400, 'VALIDATION_ERROR'));
    }
    return next(new AppError('File upload error. Please try again.', 400, 'VALIDATION_ERROR'));
  }
  next(error);
}

module.exports = { upload, handleUploadError };
