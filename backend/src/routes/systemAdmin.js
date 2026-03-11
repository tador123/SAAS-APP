const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Property, User, AuditLog, sequelize } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

// All routes require system_admin role
router.use(authenticate, authorize('system_admin'));

// ─── Property / Client Management ─────────────────────────────────

// GET /api/system-admin/properties — List all properties with stats
router.get('/properties', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status; // pending, approved, rejected
    const search = req.query.search || '';

    const where = {};
    if (status) where.approvalStatus = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Property.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'users',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      paranoid: false, // include soft-deleted
    });

    res.json({
      properties: rows,
      pagination: {
        page,
        totalPages: Math.ceil(count / limit),
        total: count,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/system-admin/properties/pending — Pending approval count
router.get('/properties/pending', async (req, res, next) => {
  try {
    const count = await Property.count({ where: { approvalStatus: 'pending' } });
    res.json({ pendingCount: count });
  } catch (error) {
    next(error);
  }
});

// POST /api/system-admin/properties/:id/approve — Approve a property
router.post('/properties/:id/approve', async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const property = await Property.findByPk(req.params.id, { transaction: t });
    if (!property) {
      await t.rollback();
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.approvalStatus === 'approved') {
      await t.rollback();
      return res.status(400).json({ error: 'Property is already approved' });
    }

    await property.update({
      approvalStatus: 'approved',
      isActive: true,
      approvedAt: new Date(),
      approvedBy: req.user.id,
    }, { transaction: t });

    // Activate the admin user(s) for this property
    await User.update(
      { isActive: true },
      { where: { propertyId: property.id, role: 'admin' }, transaction: t }
    );

    await t.commit();

    await AuditLog.log({
      userId: req.user.id,
      action: 'approve',
      entityType: 'Property',
      entityId: property.id,
      changes: { approvalStatus: 'approved' },
      req,
    });

    res.json({ message: 'Property approved and activated successfully', property });
  } catch (error) {
    await t.rollback();
    next(error);
  }
});

// POST /api/system-admin/properties/:id/reject — Reject a property
router.post('/properties/:id/reject', [
  body('reason').optional().trim().isLength({ max: 500 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    await property.update({
      approvalStatus: 'rejected',
      isActive: false,
      rejectionReason: req.body.reason || null,
    });

    // Deactivate associated users
    await User.update(
      { isActive: false },
      { where: { propertyId: property.id } }
    );

    await AuditLog.log({
      userId: req.user.id,
      action: 'reject',
      entityType: 'Property',
      entityId: property.id,
      changes: { approvalStatus: 'rejected', reason: req.body.reason },
      req,
    });

    res.json({ message: 'Property rejected', property });
  } catch (error) {
    next(error);
  }
});

// PUT /api/system-admin/properties/:id/toggle — Toggle property active status
router.put('/properties/:id/toggle', async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const newActive = !property.isActive;
    await property.update({ isActive: newActive });

    // Also toggle all users for this property
    await User.update(
      { isActive: newActive },
      { where: { propertyId: property.id } }
    );

    await AuditLog.log({
      userId: req.user.id,
      action: 'update',
      entityType: 'Property',
      entityId: property.id,
      changes: { isActive: newActive },
      req,
    });

    res.json({ message: `Property ${newActive ? 'activated' : 'deactivated'}`, property });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/system-admin/properties/:id — Soft-delete a property
router.delete('/properties/:id', async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    // Deactivate all users first
    await User.update(
      { isActive: false },
      { where: { propertyId: property.id } }
    );

    await property.destroy(); // paranoid soft-delete

    await AuditLog.log({
      userId: req.user.id,
      action: 'delete',
      entityType: 'Property',
      entityId: property.id,
      req,
    });

    res.json({ message: 'Property deleted' });
  } catch (error) {
    next(error);
  }
});

// ─── Dashboard stats ──────────────────────────────────────────────

// GET /api/system-admin/stats — Global platform stats
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalProperties,
      pendingProperties,
      activeProperties,
      totalUsers,
    ] = await Promise.all([
      Property.count(),
      Property.count({ where: { approvalStatus: 'pending' } }),
      Property.count({ where: { isActive: true, approvalStatus: 'approved' } }),
      User.count({ where: { role: { [Op.ne]: 'system_admin' } } }),
    ]);

    res.json({
      totalProperties,
      pendingProperties,
      activeProperties,
      rejectedProperties: totalProperties - activeProperties - pendingProperties,
      totalUsers,
    });
  } catch (error) {
    next(error);
  }
});

// ─── User management (global) ─────────────────────────────────────

// GET /api/system-admin/users — List all users across all properties
router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const where = { role: { [Op.ne]: 'system_admin' } };
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{
        model: Property,
        as: 'property',
        attributes: ['id', 'name', 'approvalStatus'],
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      users: rows,
      pagination: {
        page,
        totalPages: Math.ceil(count / limit),
        total: count,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
