const Redis = require('ioredis');
require('dotenv').config();

let redis;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn('Redis unavailable, caching disabled');
        return null;
      }
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
  });

  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (err) => console.warn('Redis error:', err.message));
} catch (e) {
  console.warn('Redis init failed, running without cache');
}

// Cache helpers
const cache = {
  get: async (key) => {
    if (!redis) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },
  set: async (key, value, ttlSeconds = 300) => {
    if (!redis) return;
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch { /* silent */ }
  },
  del: async (...keys) => {
    if (!redis) return;
    try {
      await redis.del(...keys);
    } catch { /* silent */ }
  },
  delPattern: async (pattern) => {
    if (!redis) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(...keys);
    } catch { /* silent */ }
  },
};

module.exports = { redis, cache };
