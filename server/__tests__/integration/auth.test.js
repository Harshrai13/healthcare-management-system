// Set test environment variables before requiring modules
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

const app = require('../../src/app');
const User = require('../../src/models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Auth API — Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new patient successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'newpatient@test.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-123-4567',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newpatient@test.com');
      expect(res.body.data.user.role).toBe('PATIENT');
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.headers['set-cookie']).toBeTruthy();
    });

    it('should reject duplicate email registration', async () => {
      await User.create({
        email: 'existing@test.com',
        passwordHash: await bcrypt.hash('pass', 10),
        firstName: 'Existing',
        lastName: 'User',
        role: 'PATIENT',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'existing@test.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'incomplete@test.com',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should set httpOnly refresh token cookie', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'cookie@test.com',
        password: 'TestPass123!',
        firstName: 'Cookie',
        lastName: 'Test',
      });

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeTruthy();
      const refreshTokenCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshTokenCookie).toBeTruthy();
      expect(refreshTokenCookie).toContain('HttpOnly');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('TestPass123!', 10);
      await User.create({
        email: 'login@test.com',
        passwordHash,
        firstName: 'Login',
        lastName: 'User',
        role: 'PATIENT',
        isVerified: true,
        isActive: true,
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@test.com',
        password: 'TestPass123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe('login@test.com');
    });

    it('should reject invalid password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@test.com',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@test.com',
        password: 'TestPass123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject deactivated user', async () => {
      await User.findOneAndUpdate(
        { email: 'login@test.com' },
        { isActive: false }
      );

      const res = await request(app).post('/api/auth/login').send({
        email: 'login@test.com',
        password: 'TestPass123!',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return success even for non-existent email (security)', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({
        email: 'nonexistent@test.com',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should generate OTP for existing user', async () => {
      await User.create({
        email: 'forgot@test.com',
        passwordHash: await bcrypt.hash('pass', 10),
        firstName: 'Forgot',
        lastName: 'User',
        role: 'PATIENT',
      });

      const res = await request(app).post('/api/auth/forgot-password').send({
        email: 'forgot@test.com',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await User.findOne({ email: 'forgot@test.com' }).select('+resetOtp +resetOtpExpiry');
      expect(user.resetOtp).toBeTruthy();
      expect(user.resetOtpExpiry).toBeInstanceOf(Date);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should return 401 without refresh token cookie', async () => {
      const res = await request(app).post('/api/auth/refresh-token').send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('running');
    });
  });

  describe('Protected route without auth', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/appointments');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected route with invalid token', () => {
    it('should return 401 for invalid token', async () => {
      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});

// Helper: extract cookie value
function extractRefreshCookie(res) {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return null;
  const cookie = cookies.find((c) => c.startsWith('refreshToken='));
  return cookie;
}
