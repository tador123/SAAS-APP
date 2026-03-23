const router = require('express').Router();
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const { TableReservation, RestaurantTable, Guest, Property, MenuItem } = require('../models');
const { authenticateGuest } = require('../middleware/guestAuth');

// All routes require guest authentication
router.use(authenticateGuest);

// POST /api/guest/table-reservations — Reserve a table with optional pre-order
router.post('/', [
  body('tableId').isInt().withMessage('Table ID is required'),
  body('propertyId').isInt().withMessage('Property ID is required'),
  body('reservationDate').isDate().withMessage('Reservation date is required'),
  body('reservationTime').matches(/^\d{2}:\d{2}$/).withMessage('Reservation time is required (HH:MM)'),
  body('partySize').isInt({ min: 1, max: 20 }).withMessage('Party size must be 1-20'),
  body('specialRequests').optional().trim().escape(),
  body('preOrderItems').optional().isArray(),
  body('preOrderItems.*.menuItemId').optional().isInt(),
  body('preOrderItems.*.quantity').optional().isInt({ min: 1 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { tableId, propertyId, reservationDate, reservationTime, partySize, specialRequests, preOrderItems } = req.body;

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(reservationDate) < today) {
      return res.status(400).json({ error: 'Reservation date cannot be in the past.' });
    }

    // Validate property exists and is active
    const property = await Property.findOne({
      where: { id: propertyId, isActive: true, approvalStatus: 'approved' },
      attributes: ['id'],
    });
    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    // Validate table exists, belongs to property, and is not in maintenance
    const table = await RestaurantTable.findOne({
      where: { id: tableId, propertyId, status: { [Op.ne]: 'maintenance' } },
    });
    if (!table) {
      return res.status(404).json({ error: 'Table not found or unavailable.' });
    }

    // Validate party size doesn't exceed table capacity
    if (partySize > table.capacity) {
      return res.status(400).json({ error: `Table capacity is ${table.capacity} guests.` });
    }

    // Check for conflicting reservations (within 2-hour window)
    const timeAsMinutes = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const requestedMinutes = timeAsMinutes(reservationTime);

    const existingReservations = await TableReservation.findAll({
      where: {
        tableId,
        reservationDate,
        status: { [Op.notIn]: ['cancelled', 'no_show', 'completed'] },
      },
    });

    const hasConflict = existingReservations.some(r => {
      const existingMinutes = timeAsMinutes(r.reservationTime.slice(0, 5));
      return Math.abs(requestedMinutes - existingMinutes) < 120; // 2-hour window
    });

    if (hasConflict) {
      return res.status(409).json({ error: 'Table is not available at the requested time. Please choose a different time or table.' });
    }

    // Process pre-order items if provided
    let processedItems = [];
    let preOrderTotal = 0;
    if (preOrderItems && preOrderItems.length > 0) {
      const menuItemIds = preOrderItems.map(i => i.menuItemId);
      const menuItems = await MenuItem.findAll({
        where: { id: { [Op.in]: menuItemIds }, propertyId, isAvailable: true },
      });

      const menuItemMap = new Map(menuItems.map(m => [m.id, m]));

      for (const item of preOrderItems) {
        const menuItem = menuItemMap.get(item.menuItemId);
        if (!menuItem) continue;
        const qty = Math.max(1, item.quantity || 1);
        processedItems.push({
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity: qty,
          price: parseFloat(menuItem.price),
          notes: item.notes || '',
        });
        preOrderTotal += parseFloat(menuItem.price) * qty;
      }
    }

    // Ensure guest has a local record at this property
    let localGuest = await Guest.findOne({
      where: { email: req.guest.email, propertyId },
    });
    if (!localGuest) {
      localGuest = await Guest.create({
        firstName: req.guest.firstName,
        lastName: req.guest.lastName,
        email: req.guest.email,
        phone: req.guest.phone,
        nationality: req.guest.nationality,
        address: req.guest.address,
        dateOfBirth: req.guest.dateOfBirth,
        propertyId,
      });
    }

    const reservation = await TableReservation.create({
      tableId,
      guestId: localGuest.id,
      propertyId,
      reservationDate,
      reservationTime,
      partySize,
      specialRequests: specialRequests || null,
      preOrderItems: processedItems,
      preOrderTotal: preOrderTotal.toFixed(2),
      status: 'confirmed',
    });

    const result = await TableReservation.findByPk(reservation.id, {
      include: [
        { model: RestaurantTable, as: 'table', attributes: ['id', 'tableNumber', 'capacity', 'location'] },
      ],
    });

    res.status(201).json({ reservation: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/guest/table-reservations — List my table reservations
router.get('/', async (req, res, next) => {
  try {
    const guestRecords = await Guest.findAll({
      where: { email: req.guest.email },
      attributes: ['id'],
    });
    const guestIds = guestRecords.map(g => g.id);

    const { status, page = 1, limit = 20 } = req.query;
    const where = { guestId: { [Op.in]: guestIds } };
    if (status) where.status = status;

    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));

    const { count, rows } = await TableReservation.findAndCountAll({
      where,
      include: [
        { model: RestaurantTable, as: 'table', attributes: ['id', 'tableNumber', 'capacity', 'location'] },
        { model: Property, as: 'property', attributes: ['id', 'name', 'currency'] },
      ],
      order: [['reservationDate', 'DESC'], ['reservationTime', 'DESC']],
      limit: Math.min(50, parseInt(limit)),
      offset,
    });

    res.json({
      reservations: rows,
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

// DELETE /api/guest/table-reservations/:id — Cancel my table reservation
router.delete('/:id', async (req, res, next) => {
  try {
    const guestRecords = await Guest.findAll({
      where: { email: req.guest.email },
      attributes: ['id'],
    });
    const guestIds = guestRecords.map(g => g.id);

    const reservation = await TableReservation.findOne({
      where: {
        id: req.params.id,
        guestId: { [Op.in]: guestIds },
        status: { [Op.notIn]: ['completed', 'cancelled'] },
      },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    res.json({ message: 'Table reservation cancelled.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
