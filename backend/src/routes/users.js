const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

// All routes require admin
router.use(authenticate, authorize('admin'));

// GET /api/users — List all staff users (paginated)
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const where = {};
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
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
    await user.destroy(); // paranoid soft-delete
    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
