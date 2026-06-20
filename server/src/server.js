require('dotenv').config();

// Auto-detect Render URL for CORS and frontend links
if (process.env.RENDER_EXTERNAL_URL) {
  if (!process.env.CLIENT_URL) process.env.CLIENT_URL = process.env.RENDER_EXTERNAL_URL;
  if (!process.env.FRONTEND_URL) process.env.FRONTEND_URL = process.env.RENDER_EXTERNAL_URL;
}

// Build CLIENT_URL from separate portal URLs if provided
{
  const portalUrls = [
    process.env.PATIENT_PORTAL_URL,
    process.env.STAFF_PORTAL_URL,
  ].filter(Boolean);
  if (portalUrls.length > 0) {
    const existing = (process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean);
    const combined = [...new Set([...existing, ...portalUrls])];
    process.env.CLIENT_URL = combined.join(',');
  }
}

const http = require('http');
const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { configureCloudinary } = require('./config/cloudinary');
const { initializeSocket } = require('./config/socket');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Database (required — exit if fails)
    await connectDatabase();

    // 2. Redis (optional — server continues without it)
    try {
      await connectRedis();
    } catch (redisErr) {
      logger.warn('Redis startup failed (continuing without cache):', redisErr.message);
    }

    // 3. Cloudinary (optional)
    try {
      configureCloudinary();
    } catch (cloudErr) {
      logger.warn('Cloudinary config skipped:', cloudErr.message);
    }

    // 4. Auto-seed if database is empty (dev + production)
    try {
      const { User } = require('./models');
      const count = await User.countDocuments();
      if (count === 0) {
        logger.info('Empty database detected — running seed...');
        const { seedDatabase } = require('./seeds/seedData');
        await seedDatabase();
        logger.info('Database seeded successfully');
      }
    } catch (seedErr) {
      logger.warn('Auto-seed skipped:', seedErr.message);
    }

    const server = http.createServer(app);
    initializeSocket(server);

    server.listen(PORT, () => {
      logger.info(`VerdantCare server running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
      });
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        await disconnectRedis();
        logger.info('All connections closed.');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection', { reason: reason?.message || reason });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
