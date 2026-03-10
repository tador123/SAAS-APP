const Redis = require('ioredis');
const logger = require('./logger');

/**
 * Redis caching service — wraps ioredis with convenience methods.
 * Falls back to in-memory Map when Redis is unavailable (dev/no-Redis environments).
 */
class CacheService {
  constructor() {
    this.client = null;
    this.fallbackCache = new Map(); // in-memory fallback
    this.isRedis = false;
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 300; // 5 min default
  }

  /** Connect to Redis (call once from index.js) */
  async connect() {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;
    if (!redisUrl) {
      logger.info('Cache: Redis not configured — using in-memory fallback.');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 200, 5000),
        lazyConnect: true,
      });
      await this.client.connect();
      this.isRedis = true;
      logger.info('Cache: Connected to Redis.');
    } catch (err) {
      logger.warn('Cache: Redis connection failed — using in-memory fallback.', { error: err.message });
      this.client = null;
    }
  }

  /**
   * Get a cached value (parsed from JSON).
   * Returns null on miss.
   */
  async get(key) {
    try {
      if (this.isRedis && this.client) {
        const val = await this.client.get(key);
        return val ? JSON.parse(val) : null;
      }
      const entry = this.fallbackCache.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.fallbackCache.delete(key);
        return null;
      }
      return entry.value;
    } catch {
      return null;
    }
  }

  /**
   * Set a cached value (serialised to JSON).
   * @param {string} key
   * @param {*} value
   * @param {number} [ttl] — seconds (default: this.defaultTTL)
   */
  async set(key, value, ttl) {
    const seconds = ttl || this.defaultTTL;
    try {
      if (this.isRedis && this.client) {
        await this.client.set(key, JSON.stringify(value), 'EX', seconds);
      } else {
        this.fallbackCache.set(key, {
          value,
          expiresAt: Date.now() + seconds * 1000,
        });
      }
    } catch {
      // Swallow — cache failures should never break main flow
    }
  }

  /**
   * Delete one or more keys (supports glob patterns on Redis).
   */
  async del(...keys) {
    try {
      if (this.isRedis && this.client) {
        for (const key of keys) {
          if (key.includes('*')) {
            const matching = await this.client.keys(key);
            if (matching.length) await this.client.del(...matching);
          } else {
            await this.client.del(key);
          }
        }
      } else {
        for (const key of keys) {
          if (key.includes('*')) {
            const pattern = new RegExp('^' + key.replace(/\*/g, '.*') + '$');
            for (const k of this.fallbackCache.keys()) {
              if (pattern.test(k)) this.fallbackCache.delete(k);
            }
          } else {
            this.fallbackCache.delete(key);
          }
        }
      }
    } catch {
      // Swallow
    }
  }

  /** Flush the entire cache. */
  async flush() {
    try {
      if (this.isRedis && this.client) {
        await this.client.flushdb();
      } else {
        this.fallbackCache.clear();
      }
    } catch {
      // Swallow
    }
  }

  /** Gracefully close the Redis connection. */
  async disconnect() {
    if (this.isRedis && this.client) {
      await this.client.quit();
    }
  }
}

// Singleton
module.exports = new CacheService();
