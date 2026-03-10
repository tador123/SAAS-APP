const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Guest, AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');

// GET /api/guests
router.get('/', authenticate, tenantScope, async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const { Op } = require('sequelize');
    let where = { propertyId: req.propertyId };

    if (search) {
      where = {
        propertyId: req.propertyId,
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const { count, rows } = await Guest.findAndCountAll({
      where,
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

// GET /api/guests/:id
router.get('/:id', authenticate, tenantScope, async (req, res, next) => {
  try {
    const guest = await Guest.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });
    res.json(guest);
  } catch (error) {
    next(error);
  }
});

// POST /api/guests
router.post('/', authenticate, tenantScope, [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('phone').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { firstName, lastName, email, phone, idType, idNumber, nationality, address, dateOfBirth, vipStatus, notes } = req.body;
    const guest = await Guest.create({ firstName, lastName, email, phone, idType, idNumber, nationality, address, dateOfBirth, vipStatus, notes, propertyId: req.propertyId });
    await AuditLog.log({ userId: req.user.id, action: 'create', entityType: 'Guest', entityId: guest.id, req });
    res.status(201).json(guest);
  } catch (error) {
    next(error);
  }
});

// PUT /api/guests/:id
router.put('/:id', authenticate, tenantScope, [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email format'),
  body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
  body('idType').optional({ nullable: true }).isIn(['passport', 'national_id', 'drivers_license', 'other']),
  body('dateOfBirth').optional({ nullable: true }).isDate(),
  body('vipStatus').optional().isBoolean(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const guest = await Guest.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    const { firstName, lastName, email, phone, idType, idNumber, nationality, address, dateOfBirth, vipStatus, notes } = req.body;
    await guest.update({ firstName, lastName, email, phone, idType, idNumber, nationality, address, dateOfBirth, vipStatus, notes });
    await AuditLog.log({ userId: req.user.id, action: 'update', entityType: 'Guest', entityId: guest.id, req });
    res.json(guest);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/guests/:id
router.delete('/:id', authenticate, authorize('admin', 'manager'), tenantScope, async (req, res, next) => {
  try {
    const guest = await Guest.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    await guest.destroy();
    await AuditLog.log({ userId: req.user.id, action: 'delete', entityType: 'Guest', entityId: guest.id, req });
    res.json({ message: 'Guest deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
