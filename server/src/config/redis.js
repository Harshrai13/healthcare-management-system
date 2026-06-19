const Redis = require('ioredis');

let redisClient = null;
let redisAvailable = false;

function getRedisClient() {
  return redisClient;
}

function isRedisAvailable() {
  return redisAvailable && redisClient && redisClient.status === 'ready';
}

// Safe Redis wrapper — never throws, returns null on failure
async function redisSafeGet(key) {
  if (!isRedisAvailable()) return null;
  try { return await redisClient.get(key); } catch { return null; }
}

async function redisSafeSet(key, value, ...args) {
  if (!isRedisAvailable()) return null;
  try { return await redisClient.set(key, value, ...args); } catch { return null; }
}

async function redisSafeIncr(key) {
  if (!isRedisAvailable()) return null;
  try { return await redisClient.incr(key); } catch { return null; }
}

async function redisSafeExpire(key, seconds) {
  if (!isRedisAvailable()) return null;
  try { return await redisClient.expire(key, seconds); } catch { return null; }
}

async function redisSafeDel(key) {
  if (!isRedisAvailable()) return null;
  try { return await redisClient.del(key); } catch { return null; }
}

async function connectRedis() {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 2) return null; // stop retrying
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on('ready', () => {
      redisAvailable = true;
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('error', () => {
      redisAvailable = false;
    });

    redisClient.on('close', () => {
      redisAvailable = false;
    });

    await redisClient.connect();
    redisAvailable = redisClient.status === 'ready';
  } catch (error) {
    redisAvailable = false;
    console.warn('⚠️  Redis unavailable (app continues without cache/rate-limit):', error.message);
  }
}

async function disconnectRedis() {
  if (redisClient) {
    try { await redisClient.quit(); } catch { /* ignore */ }
    redisClient = null;
    redisAvailable = false;
  }
}

module.exports = {
  getRedisClient,
  isRedisAvailable,
  connectRedis,
  disconnectRedis,
  redisSafeGet,
  redisSafeSet,
  redisSafeIncr,
  redisSafeExpire,
  redisSafeDel,
};
