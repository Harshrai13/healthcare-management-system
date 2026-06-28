// Test setup — runs before all test files (before test framework is installed)
// Only set environment variables here; do NOT use beforeAll/afterAll
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:5173';
