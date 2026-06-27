const Redis = require('ioredis');
require('dotenv').config();

let redis;

try {
  const opts = {
    retryStrategy: (times) => {
      if (times > 3) { console.warn('Redis unavailable'); return null; }
      return Math.min(times * 200, 3000);
    },
    lazyConnect: true,
    tls: process.env.REDIS_URL ? {} : undefined,
  };

  redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, opts)
    : new Redis({ host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT) || 6379, ...opts });

  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error',   (e) => console.warn('Redis:', e.message));
} catch (e) {
  console.warn('Redis init failed, running without cache');
}

const cache = {
  get: async (key) => {
    if (!redis) return null;
    try { const d = await redis.get(key); return d ? JSON.parse(d) : null; } catch { return null; }
  },
  set: async (key, value, ttl = 300) => {
    if (!redis) return;
    try { await redis.setex(key, ttl, JSON.stringify(value)); } catch {}
  },
  del: async (...keys) => {
    if (!redis) return;
    try { await redis.del(...keys); } catch {}
  },
  delPattern: async (pattern) => {
    if (!redis) return;
    try { const keys = await redis.keys(pattern); if (keys.length) await redis.del(...keys); } catch {}
  },
};

module.exports = { redis, cache };
