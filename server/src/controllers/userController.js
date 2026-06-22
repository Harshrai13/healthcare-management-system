const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { AppError, ErrorCodes } = require('../utils/AppError');
const logger = require('../utils/logger');
const { generateTOTPSecret, generateQRCode, verifyTOTP } = require('../utils/twoFactor');
const { uploadToCloudinary } = require('../config/cloudinary');

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('_id email firstName lastName phone avatar address dateOfBirth gender emergencyContact role createdAt preferences twoFactorEnabled');

    if (!user) {
      throw new AppError('User not found.', 404, ErrorCodes.NOT_FOUND);
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { firstName, lastName, phone, avatar, address, dateOfBirth, gender, emergencyContact, preferences } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, phone, avatar, address, dateOfBirth, gender, emergencyContact, preferences },
      { new: true, projection: '_id email firstName lastName phone avatar address dateOfBirth gender emergencyContact role preferences' }
    );

    logger.info('Profile updated', { userId: user._id });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError('User not found.', 404, ErrorCodes.NOT_FOUND);
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError('Current password is incorrect.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(req.user.id, { passwordHash });

    logger.info('Password changed', { userId: user._id });

    res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
}

async function setupTwoFactor(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw new AppError('User not found.', 404, ErrorCodes.NOT_FOUND);

    const { secret } = generateTOTPSecret(user.email);
    await User.findByIdAndUpdate(req.user.id, { twoFactorSecret: secret });

    const qrCode = await generateQRCode(user.email, secret);
    res.json({ success: true, data: { secret, qrCode } });
  } catch (error) {
    next(error);
  }
}

async function verifyTwoFactor(req, res, next) {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || !user.twoFactorSecret) {
      throw new AppError('2FA not set up. Please setup first.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const isValid = verifyTOTP(user.twoFactorSecret, token);
    if (!isValid) {
      throw new AppError('Invalid verification code.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    await User.findByIdAndUpdate(req.user.id, { twoFactorEnabled: true });
    logger.info('2FA enabled', { userId: user._id });

    res.json({ success: true, message: 'Two-factor authentication enabled successfully.' });
  } catch (error) {
    next(error);
  }
}

async function disableTwoFactor(req, res, next) {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) throw new AppError('User not found.', 404, ErrorCodes.NOT_FOUND);

    if (password) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) throw new AppError('Incorrect password.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    await User.findByIdAndUpdate(req.user.id, { twoFactorEnabled: false, twoFactorSecret: null });
    logger.info('2FA disabled', { userId: user._id });

    res.json({ success: true, message: 'Two-factor authentication disabled.' });
  } catch (error) {
    next(error);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('No image file provided.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const result = await uploadToCloudinary(req.file.buffer, 'avatars', 'image');

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: result.url },
      { new: true, projection: '_id email firstName lastName phone avatar role' }
    );

    logger.info('Avatar uploaded', { userId: user._id });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getProfile, updateProfile, changePassword, setupTwoFactor, verifyTwoFactor, disableTwoFactor, uploadAvatar };
