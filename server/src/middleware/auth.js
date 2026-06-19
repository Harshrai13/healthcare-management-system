const { verifyAccessToken } = require('../utils/token');
const { AppError, ErrorCodes } = require('../utils/AppError');
const User = require('../models/User');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next(new AppError('Authentication required. Please log in.', 401, ErrorCodes.UNAUTHORIZED));
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return next(new AppError('Your session has expired. Please log in again.', 401, ErrorCodes.TOKEN_EXPIRED));
    return next(new AppError('Invalid authentication token.', 401, ErrorCodes.TOKEN_INVALID));
  }
}

function authorize(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) return next(new AppError('Authentication required.', 401, ErrorCodes.UNAUTHORIZED));
    if (!allowedRoles.includes(req.user.role)) return next(new AppError('You do not have permission to perform this action.', 403, ErrorCodes.FORBIDDEN));
    try {
      const user = await User.findById(req.user.id).select('isActive role');
      if (!user || !user.isActive) return next(new AppError('Your account has been deactivated. Please contact support.', 403, ErrorCodes.FORBIDDEN));
      if (user.role !== req.user.role) return next(new AppError('Role mismatch detected. Please re-authenticate.', 403, ErrorCodes.FORBIDDEN));
      next();
    } catch (error) { next(new AppError('Failed to verify user status.', 500, ErrorCodes.INTERNAL_ERROR)); }
  };
}

module.exports = { authenticate, authorize };
