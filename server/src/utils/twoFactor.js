const OTPAuth = require('otpauth');
const QRCode = require('qrcode');

function generateTOTPSecret(email) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'VerdantCare Medical Center',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
  return { secret: secret.base32, totp };
}

async function generateQRCode(email, secret) {
  const totp = new OTPAuth.TOTP({
    issuer: 'VerdantCare Medical Center',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  const otpauthUrl = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  return qrCodeDataUrl;
}

function verifyTOTP(secret, token) {
  const totp = new OTPAuth.TOTP({
    issuer: 'VerdantCare Medical Center',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

module.exports = { generateTOTPSecret, generateQRCode, verifyTOTP };
