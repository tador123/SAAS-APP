const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

// All routes require admin (system_admin passes via authorize bypass)
router.use(authenticate, authorize('admin'));

// GET /api/users — List staff users (scoped to property for client admins)
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const where = {};

    // Client admins can only see their own property's users
    if (req.user.role !== 'system_admin') {
      where.propertyId = req.user.propertyId;
    }

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

// GET /api/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Client admin can only view users in their own property
    if (req.user.role !== 'system_admin' && user.propertyId !== req.user.propertyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id — Update user (role, active status, name, etc.)
router.put('/:id', [
  body('firstName').optional().trim().notEmpty().withMessage('First name is required'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name is required'),
  body('role').optional().isIn(['admin', 'manager', 'receptionist', 'waiter', 'chef', 'staff']),
  body('isActive').optional().isBoolean(),
  body('phone').optional().trim(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Client admin can only update users in their own property
    if (req.user.role !== 'system_admin' && user.propertyId !== req.user.propertyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prevent client admin from escalating to system_admin
    if (req.body.role === 'system_admin' && req.user.role !== 'system_admin') {
      return res.status(403).json({ error: 'Cannot assign system_admin role' });
    }

    const allowed = ['firstName', 'lastName', 'role', 'isActive', 'phone'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await user.update(updates);

    const updated = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
    });

    res.json({ message: 'User updated', user: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id — Soft-delete (deactivate) user
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    // Client admin can only delete users in their own property
    if (req.user.role !== 'system_admin' && user.propertyId !== req.user.propertyId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await user.destroy(); // paranoid soft-delete
    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
