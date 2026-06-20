const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { redisSafeGet, redisSafeSet, redisSafeIncr, redisSafeExpire, redisSafeDel } = require('../config/redis');
const { generateAuthTokens, verifyRefreshToken } = require('../utils/token');
const { AppError, ErrorCodes } = require('../utils/AppError');
const logger = require('../utils/logger');
const { sendEmailNotification } = require('../utils/notificationService');
const { verifyTOTP } = require('../utils/twoFactor');

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

async function register(req, res, next) {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new AppError('An account with this email already exists.', 409, ErrorCodes.CONFLICT);
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, firstName, lastName, phone, role: 'PATIENT' });

    // Generate 6-digit verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis (primary) and DB (fallback)
    const redisKey = `verify_email:${email}`;
    await redisSafeSet(redisKey, otp, 'EX', 900); // 15 minutes
    await User.findByIdAndUpdate(user._id, {
      verificationOtp: otp,
      verificationOtpExpiry: new Date(Date.now() + 15 * 60 * 1000),
    });

    // Log OTP to console for immediate visibility
    console.log('\n\n ═══════════════════════════════════════════');
    console.log(`   VERIFICATION CODE for ${email}: ${otp}`);
    console.log('═══════════════════════════════════════════\n\n');

    // Send verification email and track result
    const emailResult = await sendEmailNotification(user.email, 'emailVerification', { firstName: user.firstName, otp });

    logger.info('User registered', { userId: user._id, email: user.email, emailSent: emailResult?.emailSent });
    res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      data: { userId: user._id, email: user.email },
      emailSent: emailResult?.emailSent ?? false,
      // DEV ONLY: OTP shown in response for testing (remove in production)
      ...(process.env.NODE_ENV === 'development' && { devOtp: otp }),
    });
  } catch (error) { next(error); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const lockKey = `login_attempts:${email}`;
    const attempts = await redisSafeGet(lockKey);
    if (attempts && parseInt(attempts) >= 5) throw new AppError('Too many failed login attempts. Please try again in 15 minutes.', 429, ErrorCodes.ACCOUNT_LOCKED);
    const user = await User.findOne({ email });
    if (!user || !user.isActive) throw new AppError('Invalid email or password.', 401, ErrorCodes.UNAUTHORIZED);
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) { await redisSafeIncr(lockKey); await redisSafeExpire(lockKey, 900); throw new AppError('Invalid email or password.', 401, ErrorCodes.UNAUTHORIZED); }
    await redisSafeDel(lockKey);

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      const tempToken = require('../utils/token').generateAuthTokens(user);
      // Store user info for 2FA verification step
      const twoFAToken = crypto.randomBytes(32).toString('hex');
      const redis2FAKey = `2fa_login:${twoFAToken}`;
      await redisSafeSet(redis2FAKey, JSON.stringify({ userId: user._id.toString() }), 'EX', 300); // 5 min
      res.json({ success: true, message: '2FA verification required.', data: { requires2FA: true, twoFAToken } });
      return;
    }

    const tokens = generateAuthTokens(user);
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    logger.info('User logged in', { userId: user._id });
    res.json({ success: true, message: 'Login successful.', data: { user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: user.avatar, isVerified: user.isVerified }, accessToken: tokens.accessToken } });
  } catch (error) { next(error); }
}

async function verify2FALogin(req, res, next) {
  try {
    const { twoFAToken, code } = req.body;
    const redis2FAKey = `2fa_login:${twoFAToken}`;
    const stored = await redisSafeGet(redis2FAKey);
    if (!stored) throw new AppError('2FA session expired. Please login again.', 401, ErrorCodes.UNAUTHORIZED);

    const { userId } = JSON.parse(stored);
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, ErrorCodes.NOT_FOUND);

    const isValid = verifyTOTP(user.twoFactorSecret, code);
    if (!isValid) throw new AppError('Invalid 2FA code.', 401, ErrorCodes.UNAUTHORIZED);

    await redisSafeDel(redis2FAKey);
    const tokens = generateAuthTokens(user);
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    logger.info('User logged in with 2FA', { userId: user._id });
    res.json({ success: true, message: 'Login successful.', data: { user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: user.avatar, isVerified: user.isVerified }, accessToken: tokens.accessToken } });
  } catch (error) { next(error); }
}

async function refreshToken(req, res, next) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) throw new AppError('Refresh token not found. Please log in again.', 401, ErrorCodes.UNAUTHORIZED);
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('_id email role isActive');
    if (!user || !user.isActive) throw new AppError('User not found or deactivated.', 401, ErrorCodes.UNAUTHORIZED);
    const tokens = generateAuthTokens(user);
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, data: { accessToken: tokens.accessToken } });
  } catch (error) { next(error); }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: 'If an account exists with this email, a reset code has been sent.' });

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const redisKey = `pwd_reset:${email}`;

    // Store OTP in Redis (primary) and DB (fallback)
    await redisSafeSet(redisKey, otp, 'EX', 600);
    await User.findByIdAndUpdate(user._id, {
      resetOtp: otp,
      resetOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Log OTP to console for immediate visibility
    console.log('\n\n ═══════════════════════════════════════════');
    console.log(`   VERIFICATION CODE for ${email}: ${otp}`);
    console.log('═══════════════════════════════════════════\n\n');

    logger.info('Password reset OTP generated', { userId: user._id });

    // Send OTP via email and track result
    const emailResult = await sendEmailNotification(user.email, 'otpPasswordReset', { firstName: user.firstName, otp });

    res.json({ success: true, message: 'If an account exists with this email, a reset code has been sent.',
      emailSent: emailResult?.emailSent ?? false,
      // DEV ONLY: OTP shown in response for testing (remove in production)
      ...(process.env.NODE_ENV === 'development' && { devOtp: otp }),
    });
  } catch (error) { next(error); }
}

async function verifyResetOTP(req, res, next) {
  try {
    const { email, otp } = req.body;
    const redisKey = `pwd_reset:${email}`;
    let storedOtp = await redisSafeGet(redisKey);

    // Fallback: check DB for OTP
    if (!storedOtp) {
      const user = await User.findOne({ email });
      if (user?.resetOtp && user.resetOtpExpiry > new Date()) {
        storedOtp = user.resetOtp;
      }
    }

    if (!storedOtp) throw new AppError('OTP has expired or does not exist. Please request a new code.', 400, ErrorCodes.VALIDATION_ERROR);
    if (storedOtp !== otp) throw new AppError('Invalid OTP code. Please try again.', 400, ErrorCodes.VALIDATION_ERROR);

    res.json({ success: true, message: 'OTP verified successfully. You can now reset your password.' });
  } catch (error) { next(error); }
}

async function resetPassword(req, res, next) {
  try {
    const { email, otp, password } = req.body;
    const redisKey = `pwd_reset:${email}`;
    let storedOtp = await redisSafeGet(redisKey);

    // Fallback: check DB for OTP
    if (!storedOtp) {
      const user = await User.findOne({ email });
      if (user?.resetOtp && user.resetOtpExpiry > new Date()) {
        storedOtp = user.resetOtp;
      }
    }

    if (!storedOtp) throw new AppError('OTP has expired or does not exist. Please request a new code.', 400, ErrorCodes.VALIDATION_ERROR);
    if (storedOtp !== otp) throw new AppError('Invalid OTP code. Please try again.', 400, ErrorCodes.VALIDATION_ERROR);

    const user = await User.findOne({ email });
    if (!user) throw new AppError('User not found.', 404, ErrorCodes.NOT_FOUND);

    const passwordHash = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(user._id, {
      passwordHash,
      resetOtp: null,
      resetOtpExpiry: null,
    });

    // Clear OTP from Redis
    await redisSafeDel(redisKey);

    logger.info('Password reset completed', { userId: user._id });
    res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
  } catch (error) { next(error); }
}

async function googleAuth(req, res, next) {
  try {
    if (!googleClient) throw new AppError('Google Sign-In is not configured. Set GOOGLE_CLIENT_ID.', 503, ErrorCodes.SERVICE_UNAVAILABLE);

    const { credential } = req.body;

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: avatar } = payload;

    // Find existing user by Google ID or email
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if user exists with this email (link accounts)
      user = await User.findOne({ email });
      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        user.authProvider = 'google';
        if (!user.avatar) user.avatar = avatar;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          email,
          firstName: firstName || 'User',
          lastName: lastName || '',
          googleId,
          authProvider: 'google',
          avatar,
          role: 'PATIENT',
        });
      }
    }

    if (!user.isActive) throw new AppError('Account is deactivated.', 403, ErrorCodes.FORBIDDEN);

    const tokens = generateAuthTokens(user);
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

    logger.info('Google OAuth login', { userId: user._id, email });
    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: user.avatar },
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    if (error.message.includes('Token used too late') || error.message.includes('Invalid token')) {
      return next(new AppError('Invalid or expired Google token.', 401, ErrorCodes.UNAUTHORIZED));
    }
    next(error);
  }
}

async function logout(req, res) { res.clearCookie('refreshToken'); res.json({ success: true, message: 'Logged out successfully.' }); }

async function verifyEmail(req, res, next) {
  try {
    const { email, otp } = req.body;

    // Try Redis first, fall back to DB
    const redisKey = `verify_email:${email}`;
    let storedOtp = await redisSafeGet(redisKey);

    if (!storedOtp) {
      // Fallback: check DB for OTP
      const user = await User.findOne({ email });
      if (user?.verificationOtp && user.verificationOtpExpiry > new Date()) {
        storedOtp = user.verificationOtp;
      }
    }

    if (!storedOtp) throw new AppError('Verification code has expired or does not exist. Please request a new one.', 400, ErrorCodes.VALIDATION_ERROR);
    if (storedOtp !== otp) throw new AppError('Invalid verification code. Please try again.', 400, ErrorCodes.VALIDATION_ERROR);

    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true, verificationOtp: null, verificationOtpExpiry: null },
      { new: true }
    );
    if (!user) throw new AppError('User not found.', 404, ErrorCodes.NOT_FOUND);

    await redisSafeDel(redisKey);
    logger.info('Email verified', { userId: user._id });
    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (error) { next(error); }
}

async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: 'If an account exists with this email, a verification code has been sent.' });
    if (user.isVerified) return res.json({ success: true, message: 'Your email is already verified.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `verify_email:${email}`;
    await redisSafeSet(redisKey, otp, 'EX', 900);
    await User.findByIdAndUpdate(user._id, {
      verificationOtp: otp,
      verificationOtpExpiry: new Date(Date.now() + 15 * 60 * 1000),
    });

    // Log OTP to console
    console.log('\n\n ═══════════════════════════════════════════');
    console.log(`   VERIFICATION CODE for ${email}: ${otp}`);
    console.log('═══════════════════════════════════════════\n\n');

    const emailResult = await sendEmailNotification(user.email, 'emailVerification', { firstName: user.firstName, otp });
    logger.info('Verification email resent', { userId: user._id, emailSent: emailResult?.emailSent });
    res.json({ success: true, message: 'Verification code sent to your email.', emailSent: emailResult?.emailSent ?? false });
  } catch (error) { next(error); }
}

module.exports = { register, login, refreshToken, forgotPassword, verifyResetOTP, resetPassword, googleAuth, logout, verifyEmail, resendVerification, verify2FALogin };
