module.exports = {
  testEnvironment: 'node',
  setupFilesAfterSetup: ['./__tests__/setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 30000,
};
