const crypto = require('crypto');

/**
 * Middleware that attaches a unique request ID to every request.
 * - Uses the incoming `X-Request-Id` header if present (from load-balancer / gateway).
 * - Otherwise generates a UUID v4.
 * - Stores on `req.id` and echoes back via `X-Request-Id` response header.
 */
const requestId = (req, res, next) => {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};

module.exports = requestId;
