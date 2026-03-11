const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const { HousekeepingTask, Room, User, AuditLog } = require('../models');
const websocketService = require('../services/websocketService');

// GET all tasks (with filters)
router.get('/', authenticate, tenantScope, async (req, res, next) => {
  try {
    const { status, priority, assignedTo, roomId, page = 1, limit = 20 } = req.query;
    const where = { propertyId: req.propertyId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = parseInt(assignedTo);
    if (roomId) where.roomId = parseInt(roomId);

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const { count, rows } = await HousekeepingTask.findAndCountAll({
      where,
      include: [
        { model: Room, as: 'room', attributes: ['id', 'roomNumber', 'floor', 'type'] },
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'inspector', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: Math.min(parseInt(limit), 100),
      offset,
    });

    res.json({
      data: rows,
      pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) },
    });
  } catch (error) { next(error); }
});

// POST create task
router.post('/', authenticate, authorize('admin', 'manager'), tenantScope, [
  body('roomId').isInt({ min: 1 }),
  body('type').optional().isIn(['checkout_clean', 'daily_clean', 'deep_clean', 'maintenance', 'inspection']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignedTo').optional().isInt({ min: 1 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { roomId, type, priority, assignedTo, notes } = req.body;
    const task = await HousekeepingTask.create({
      roomId, type, priority, assignedTo, notes, propertyId: req.propertyId,
    });

    const full = await HousekeepingTask.findByPk(task.id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'roomNumber', 'floor', 'type'] },
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName'] },
      ],
    });

    await AuditLog.log({ userId: req.user.id, action: 'create', entityType: 'HousekeepingTask', entityId: task.id, req });
    websocketService.emitHousekeepingUpdate(full);
    res.status(201).json(full);
  } catch (error) { next(error); }
});

// PUT update task
router.put('/:id', authenticate, tenantScope, [
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'inspected']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignedTo').optional().isInt({ min: 1 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const task = await HousekeepingTask.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { status, priority, assignedTo, notes } = req.body;
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (notes !== undefined) updates.notes = notes;

    // Auto-set timestamps
    if (status === 'completed') updates.completedAt = new Date();
    if (status === 'inspected') {
      updates.inspectedBy = req.user.id;
      updates.inspectedAt = new Date();
    }

    await task.update(updates);

    // If inspected → mark room as available
    if (status === 'inspected') {
      await Room.update({ status: 'available' }, { where: { id: task.roomId } });
    }

    const full = await HousekeepingTask.findByPk(task.id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'roomNumber', 'floor', 'type'] },
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'inspector', attributes: ['id', 'firstName', 'lastName'] },
      ],
    });

    await AuditLog.log({ userId: req.user.id, action: 'update', entityType: 'HousekeepingTask', entityId: task.id, req });
    websocketService.emitHousekeepingUpdate(full);
    res.json(full);
  } catch (error) { next(error); }
});

// DELETE task
router.delete('/:id', authenticate, authorize('admin', 'manager'), tenantScope, async (req, res, next) => {
  try {
    const task = await HousekeepingTask.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const taskId = task.id;
    await task.destroy();
    await AuditLog.log({ userId: req.user.id, action: 'delete', entityType: 'HousekeepingTask', entityId: taskId, req });
    res.json({ message: 'Task deleted' });
  } catch (error) { next(error); }
});

module.exports = router;
