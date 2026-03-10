const cacheService = require('../services/cacheService');

/**
 * Express middleware factory for HTTP GET caching.
 * @param {number} [ttl=300] — Cache TTL in seconds.
 * @param {function} [keyFn] — Custom key generator (req) => string.
 */
function cacheMiddleware(ttl = 300, keyFn) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = keyFn ? keyFn(req) : `http:${req.originalUrl}`;

    try {
      const cached = await cacheService.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
    } catch {
      // Cache failure — proceed without cache
    }

    // Monkey-patch res.json to intercept the response and cache it
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(key, body, ttl).catch(() => {});
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

module.exports = cacheMiddleware;
