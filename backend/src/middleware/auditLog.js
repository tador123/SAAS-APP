const { AuditLog } = require('../models');
const logger = require('../services/logger');

/**
 * Express middleware factory that logs audit events after successful mutations.
 * Usage: router.post('/', authenticate, auditLog('create', 'Room'), handler)
 * 
 * The actual entity ID is extracted from `res.locals.auditEntityId` or the response body.
 * For simple use, call AuditLog.log() directly in route handlers instead.
 * 
 * @param {string} action - 'create' | 'update' | 'delete' | 'status_change'
 * @param {string} entityType - e.g. 'Room', 'Order', 'Invoice'
 */
const auditLog = (action, entityType) => {
  return (req, res, next) => {
    // Capture the original json method
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Only log on successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = res.locals?.auditEntityId || data?.id || req.params?.id;

        AuditLog.log({
          userId: req.user.id,
          action,
          entityType,
          entityId: entityId ? parseInt(entityId) : null,
          changes: action === 'delete' ? { deleted: true } : undefined,
          req,
        }).catch(err => logger.error('Audit middleware error', { error: err.message }));
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = auditLog;
