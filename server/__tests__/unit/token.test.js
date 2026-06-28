// Set test environment variables before requiring modules
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateAuthTokens,
  decodeToken,
} = require('../../src/utils/token');

describe('Token Utility — Unit Tests', () => {
  const mockUser = { id: '507f1f77bcf86cd799439011', email: 'test@test.com', role: 'PATIENT' };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = generateAccessToken(mockUser);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include user id, email, and role in payload', () => {
      const token = generateAccessToken(mockUser);
      const decoded = decodeToken(token);
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const token = generateRefreshToken(mockUser);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(mockUser);
      const decoded = verifyAccessToken(token);
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    it('should throw on invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });

    it('should throw on token signed with wrong secret', () => {
      const jwt = require('jsonwebtoken');
      const wrongToken = jwt.sign(mockUser, 'wrong-secret');
      expect(() => verifyAccessToken(wrongToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken(mockUser);
      const decoded = verifyRefreshToken(token);
      expect(decoded.id).toBe(mockUser.id);
    });

    it('should throw on invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid')).toThrow();
    });
  });

  describe('generateAuthTokens', () => {
    it('should return both accessToken and refreshToken', () => {
      const tokens = generateAuthTokens(mockUser);
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should generate tokens that verify correctly', () => {
      const tokens = generateAuthTokens(mockUser);
      const accessDecoded = verifyAccessToken(tokens.accessToken);
      const refreshDecoded = verifyRefreshToken(tokens.refreshToken);
      expect(accessDecoded.id).toBe(mockUser.id);
      expect(refreshDecoded.id).toBe(mockUser.id);
    });
  });

  describe('decodeToken', () => {
    it('should decode without verifying', () => {
      const token = generateAccessToken(mockUser);
      const decoded = decodeToken(token);
      expect(decoded.id).toBe(mockUser.id);
    });

    it('should return null for malformed token', () => {
      expect(decodeToken('not-a-jwt')).toBeNull();
    });
  });
});
