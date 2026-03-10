const router = require('express').Router();
const { AuditLog, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');

// GET /api/audit-logs — Admin/Manager only, scoped to own property
router.get('/', authenticate, authorize('admin', 'manager'), tenantScope, async (req, res, next) => {
  try {
    const { action, entityType, userId, page = 1, limit = 50 } = req.query;
    const where = {};

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = parseInt(userId);

    // Scope: only show audit logs for users belonging to the same property
    const userWhere = {};
    if (req.propertyId) {
      userWhere.propertyId = req.propertyId;
    }

    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(parseInt(limit), 100);
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username', 'role'], where: userWhere },
      ],
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit), 100),
      offset,
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
