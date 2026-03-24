const router = require('express').Router();
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const { Reservation, Room, Property, Guest } = require('../models');
const { authenticateGuest } = require('../middleware/guestAuth');
const websocketService = require('../services/websocketService');

// All routes require guest authentication
router.use(authenticateGuest);

// POST /api/guest/bookings — Create a reservation
router.post('/', [
  body('roomId').isInt().withMessage('Room ID is required'),
  body('checkIn').isDate().withMessage('Check-in date is required'),
  body('checkOut').isDate().withMessage('Check-out date is required'),
  body('adults').optional().isInt({ min: 1 }),
  body('children').optional().isInt({ min: 0 }),
  body('specialRequests').optional().trim().escape(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { roomId, checkIn, checkOut, adults = 1, children = 0, specialRequests } = req.body;

    // Validate check-out is after check-in
    if (new Date(checkOut) <= new Date(checkIn)) {
      return res.status(400).json({ error: 'Check-out must be after check-in.' });
    }

    // Validate check-in is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(checkIn) < today) {
      return res.status(400).json({ error: 'Check-in cannot be in the past.' });
    }

    // Find the room and ensure it belongs to an active property
    const room = await Room.findByPk(roomId, {
      include: [{
        model: Property,
        as: 'property',
        where: { isActive: true, approvalStatus: 'approved' },
      }],
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found or property not available.' });
    }

    // Check for overlapping reservations
    const overlap = await Reservation.findOne({
      where: {
        roomId,
        status: { [Op.notIn]: ['cancelled', 'no_show', 'checked_out'] },
        checkIn: { [Op.lt]: checkOut },
        checkOut: { [Op.gt]: checkIn },
      },
    });

    if (overlap) {
      return res.status(409).json({ error: 'Room is not available for the selected dates.' });
    }

    // Calculate total (nights * price)
    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const totalAmount = (parseFloat(room.price) * nights).toFixed(2);

    // Ensure guest has a local record at this property
    let localGuest = await Guest.findOne({
      where: { email: req.guest.email, propertyId: room.propertyId },
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
        propertyId: room.propertyId,
      });
    }

    const reservation = await Reservation.create({
      guestId: localGuest.id,
      roomId,
      checkIn,
      checkOut,
      adults,
      children,
      totalAmount,
      specialRequests: specialRequests || null,
      source: 'website',
      status: 'pending',
      propertyId: room.propertyId,
    });

    // Fetch with associations
    const result = await Reservation.findByPk(reservation.id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'roomNumber', 'type', 'price', 'images'] },
        { model: Property, as: 'property', attributes: ['id', 'name', 'address', 'city', 'images', 'phone'] },
        { model: Guest, as: 'guest', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    // Emit real-time notification for property admin
    websocketService.emitNewReservation(result.toJSON());
    websocketService.emitDashboardRefresh(room.propertyId);

    res.status(201).json({ reservation: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/guest/bookings — List my bookings
router.get('/', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    // Find all local guest records for this guest email
    const guestRecords = await Guest.findAll({
      where: { email: req.guest.email },
      attributes: ['id'],
    });

    const guestIds = guestRecords.map(g => g.id);

    const where = { guestId: { [Op.in]: guestIds } };
    if (status) where.status = status;

    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));

    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [
        { model: Room, as: 'room', attributes: ['id', 'roomNumber', 'type', 'price', 'images'] },
        { model: Property, as: 'property', attributes: ['id', 'name', 'address', 'city', 'images', 'phone', 'currency'] },
      ],
      order: [['checkIn', 'DESC']],
      limit: Math.min(50, parseInt(limit)),
      offset,
    });

    res.json({
      bookings: rows,
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

// GET /api/guest/bookings/:id — Booking detail
router.get('/:id', async (req, res, next) => {
  try {
    const guestRecords = await Guest.findAll({
      where: { email: req.guest.email },
      attributes: ['id'],
    });
    const guestIds = guestRecords.map(g => g.id);

    const reservation = await Reservation.findOne({
      where: { id: req.params.id, guestId: { [Op.in]: guestIds } },
      include: [
        { model: Room, as: 'room', attributes: ['id', 'roomNumber', 'type', 'price', 'floor', 'amenities', 'images', 'maxOccupancy'] },
        { model: Property, as: 'property', attributes: ['id', 'name', 'address', 'city', 'country', 'images', 'phone', 'email', 'currency'] },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    res.json({ reservation });
  } catch (error) {
    next(error);
  }
});

// PUT /api/guest/bookings/:id/cancel — Cancel a booking
router.put('/:id/cancel', async (req, res, next) => {
  try {
    const guestRecords = await Guest.findAll({
      where: { email: req.guest.email },
      attributes: ['id'],
    });
    const guestIds = guestRecords.map(g => g.id);

    const reservation = await Reservation.findOne({
      where: {
        id: req.params.id,
        guestId: { [Op.in]: guestIds },
        status: { [Op.in]: ['pending', 'confirmed'] },
      },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Booking not found or cannot be cancelled.' });
    }

    await reservation.update({ status: 'cancelled' });
    res.json({ message: 'Booking cancelled.', reservation });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
