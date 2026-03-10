const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Room, AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const { checkRoomLimit } = require('../middleware/subscription');

// GET /api/rooms
router.get('/', authenticate, tenantScope, async (req, res, next) => {
  try {
    const { status, type, floor, page = 1, limit = 20 } = req.query;
    const where = { propertyId: req.propertyId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (floor) where.floor = floor;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const { count, rows } = await Room.findAndCountAll({
      where,
      order: [['roomNumber', 'ASC']],
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

// GET /api/rooms/:id
router.get('/:id', authenticate, tenantScope, async (req, res, next) => {
  try {
    const room = await Room.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error) {
    next(error);
  }
});

// POST /api/rooms
router.post('/', authenticate, authorize('admin', 'manager'), tenantScope, checkRoomLimit, [
  body('roomNumber').trim().notEmpty(),
  body('type').isIn(['single', 'double', 'twin', 'suite', 'deluxe', 'penthouse']),
  body('floor').isInt({ min: 0 }),
  body('price').isFloat({ min: 0 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { roomNumber, type, floor, price, status, amenities, maxOccupancy, description } = req.body;
    const room = await Room.create({ roomNumber, type, floor, price, status, amenities, maxOccupancy, description, propertyId: req.propertyId });
    await AuditLog.log({ userId: req.user.id, action: 'create', entityType: 'Room', entityId: room.id, req });
    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
});

// PUT /api/rooms/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), tenantScope, [
  body('roomNumber').optional().trim().notEmpty().withMessage('Room number cannot be empty'),
  body('type').optional().isIn(['single', 'double', 'twin', 'suite', 'deluxe', 'penthouse']).withMessage('Invalid room type'),
  body('floor').optional().isInt({ min: 0 }).withMessage('Floor must be a non-negative integer'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('status').optional().isIn(['available', 'occupied', 'reserved', 'maintenance', 'cleaning']).withMessage('Invalid room status'),
  body('maxOccupancy').optional().isInt({ min: 1 }).withMessage('Max occupancy must be at least 1'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const room = await Room.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const { roomNumber, type, floor, price, status, amenities, maxOccupancy, description } = req.body;
    await room.update({ roomNumber, type, floor, price, status, amenities, maxOccupancy, description });
    await AuditLog.log({ userId: req.user.id, action: 'update', entityType: 'Room', entityId: room.id, req });
    res.json(room);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', authenticate, authorize('admin'), tenantScope, async (req, res, next) => {
  try {
    const room = await Room.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const roomId = room.id;
    await room.destroy();
    await AuditLog.log({ userId: req.user.id, action: 'delete', entityType: 'Room', entityId: roomId, req });
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
