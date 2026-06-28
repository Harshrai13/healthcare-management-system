const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyResetOTPSchema,
  googleAuthSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} = require('../validators/authValidator');
const authController = require('../controllers/authController');

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/verify-2fa-login', authLimiter, authController.verify2FALogin);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/verify-reset-otp', authLimiter, validate(verifyResetOTPSchema), authController.verifyResetOTP);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/google', authLimiter, validate(googleAuthSchema), authController.googleAuth);
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', authLimiter, validate(resendVerificationSchema), authController.resendVerification);
router.post('/logout', authController.logout);

module.exports = router;
