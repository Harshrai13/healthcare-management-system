const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
require('./setup');

describe('Auth API', () => {
  const testUser = {
    email: 'test@verdantcare.com',
    password: 'TestPass123!',
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-0100',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.userId).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@test.com' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register and manually verify the user for login tests
      await request(app).post('/api/auth/register').send(testUser);
      await User.updateOne({ email: testUser.email }, { isVerified: true });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.isVerified).toBe(true);
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noone@test.com', password: 'TestPass123!' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh access token with valid refresh cookie', async () => {
      // Register and login to get tokens
      await request(app).post('/api/auth/register').send(testUser);
      await User.updateOne({ email: testUser.email }, { isVerified: true });
      
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should accept valid email and respond successfully', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not reveal if email exists', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should reject invalid verification code', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ email: testUser.email, otp: '000000' });

      // Without Redis, OTP check will fail (returns null)
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear refresh token cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Protected Routes', () => {
    it('should reject unauthenticated access', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('should allow authenticated access', async () => {
      // Register, verify, and login to get token
      await request(app).post('/api/auth/register').send(testUser);
      await User.updateOne({ email: testUser.email }, { isVerified: true });
      
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
require('./setup');

describe('Auth API', () => {
  const testUser = {
    email: 'test@verdantcare.com',
    password: 'TestPass123!',
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-0100',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.role).toBe('PATIENT');
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@test.com' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noone@test.com', password: 'TestPass123!' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh access token with valid refresh cookie', async () => {
      // Register to get tokens
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const cookies = registerRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should accept valid email and generate reset token', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify token was stored
      const user = await User.findOne({ email: testUser.email });
      expect(user.resetToken).toBeDefined();
      expect(user.resetTokenExpiry).toBeDefined();
    });

    it('should not reveal if email exists', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear refresh token cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Protected Routes', () => {
    it('should reject unauthenticated access', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('should allow authenticated access', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const token = registerRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
