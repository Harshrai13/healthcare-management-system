const { AppError, ErrorCodes } = require('../utils/AppError');
const logger = require('../utils/logger');

function notFoundHandler(req, res, next) {
  next(new AppError(`Route ${req.originalUrl} not found.`, 404, ErrorCodes.NOT_FOUND));
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred. Please try again later.';
  let code = err.code || ErrorCodes.INTERNAL_ERROR;

  if (err.name === 'ZodError') {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    const fieldErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    message = 'Validation failed. Please check your input.';
    logger.warn('Validation error', { path: req.path, errors: fieldErrors });
    return res.status(statusCode).json({
      success: false,
      message,
      code,
      errors: fieldErrors,
    });
  }

  if (err.code === 'P2002') {
    statusCode = 409;
    code = ErrorCodes.CONFLICT;
    const field = err.meta?.target?.join(', ') || 'field';
    message = `A record with this ${field} already exists.`;
  }

  if (err.code === 'P2025') {
    statusCode = 404;
    code = ErrorCodes.NOT_FOUND;
    message = 'The requested resource was not found.';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = ErrorCodes.TOKEN_INVALID;
    message = 'Invalid authentication token.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = ErrorCodes.TOKEN_EXPIRED;
    message = 'Your session has expired. Please log in again.';
  }

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Invalid request format. Please check your data.';
  }

  if (err.status === 429) {
    statusCode = 429;
    code = ErrorCodes.RATE_LIMIT_EXCEEDED;
    message = 'Too many requests. Please wait a moment and try again.';
  }

  if (statusCode >= 500) {
    logger.error('Server error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      user: req.user?.id,
    });
    message = 'An unexpected error occurred. Our team has been notified.';
  } else {
    logger.warn('Client error', {
      message: err.message,
      code,
      path: req.path,
      method: req.method,
    });
  }

  const response = {
    success: false,
    message,
    code,
  };

  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = { notFoundHandler, errorHandler };
