const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Op, Transaction } = require('sequelize');
const { Reservation, Guest, Room, AuditLog, Property, sequelize } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const websocketService = require('../services/websocketService');
const emailService = require('../services/emailService');
const logger = require('../services/logger');

// Valid reservation status transitions
const VALID_RESERVATION_TRANSITIONS = {
  pending: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

// GET /api/reservations
router.get('/', authenticate, tenantScope, async (req, res, next) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;
    const where = { propertyId: req.propertyId };
    if (status) where.status = status;
    if (from) where.checkIn = { ...where.checkIn, [Op.gte]: from };
    if (to) where.checkOut = { ...where.checkOut, [Op.lte]: to };

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [
        { model: Guest, as: 'guest', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
        { model: Room, as: 'room', attributes: ['id', 'roomNumber', 'type', 'price'] },
      ],
      order: [['checkIn', 'DESC']],
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

// GET /api/reservations/:id
router.get('/:id', authenticate, tenantScope, async (req, res, next) => {
  try {
    const reservation = await Reservation.findOne({
      where: { id: req.params.id, propertyId: req.propertyId },
      include: [
        { model: Guest, as: 'guest' },
        { model: Room, as: 'room' },
      ],
    });
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
  } catch (error) {
    next(error);
  }
});

// POST /api/reservations
router.post('/', authenticate, tenantScope, [
  body('guestId').isInt(),
  body('roomId').isInt(),
  body('checkIn').isDate(),
  body('checkOut').isDate(),
  body('totalAmount').isFloat({ min: 0 }),
  body('adults').optional().isInt({ min: 1 }),
  body('children').optional().isInt({ min: 0 }),
  body('source').optional().isIn(['walk_in', 'phone', 'website', 'booking_com', 'airbnb', 'other']),
], async (req, res, next) => {
  // Use SERIALIZABLE isolation to prevent concurrent double-booking
  const t = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE });
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { guestId, roomId, checkIn, checkOut, totalAmount, adults, children, specialRequests, source } = req.body;

    // Validate checkOut > checkIn
    if (new Date(checkOut) <= new Date(checkIn)) {
      await t.rollback();
      return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    // Validate room exists and is not in maintenance
    const room = await Room.findByPk(roomId, { transaction: t });
    if (!room) {
      await t.rollback();
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.status === 'maintenance') {
      await t.rollback();
      return res.status(400).json({ error: 'Room is currently under maintenance and cannot be booked' });
    }

    // Double-booking check
    const overlap = await Reservation.findOne({
      where: {
        roomId,
        status: { [Op.notIn]: ['cancelled', 'checked_out', 'no_show'] },
        checkIn: { [Op.lt]: checkOut },
        checkOut: { [Op.gt]: checkIn },
      },
      transaction: t,
    });

    if (overlap) {
      await t.rollback();
      return res.status(409).json({ error: 'Room is already booked for the selected dates' });
    }

    const reservation = await Reservation.create(
      { guestId, roomId, checkIn, checkOut, totalAmount, adults, children, specialRequests, source, propertyId: req.propertyId },
      { transaction: t }
    );

    await Room.update({ status: 'reserved' }, { where: { id: roomId }, transaction: t });
    await t.commit();

    const full = await Reservation.findByPk(reservation.id, {
      include: [
        { model: Guest, as: 'guest' },
        { model: Room, as: 'room' },
      ],
    });

    // Real-time: notify front-desk + dashboards
    websocketService.emitNewReservation(full.toJSON());
    websocketService.emitDashboardRefresh();
    await AuditLog.log({ userId: req.user.id, action: 'create', entityType: 'Reservation', entityId: full.id, req });

    // Send reservation confirmation email if guest has email
    if (full.guest?.email) {
      emailService.sendReservationConfirmation({
        to: full.guest.email,
        firstName: full.guest.firstName,
        reservationId: full.id,
        checkIn: full.checkIn,
        checkOut: full.checkOut,
        roomNumber: full.room?.roomNumber || 'TBD',
        roomType: full.room?.type || '',
        totalAmount: full.totalAmount,
        hotelName: process.env.HOTEL_NAME,
      }).catch(err => logger.error('Reservation confirmation email failed', { reservationId: full.id, error: err.message }));
    }

    res.status(201).json(full);
  } catch (error) {
    await t.rollback();
    // Handle serialization failure (concurrent booking) gracefully
    if (error.parent && error.parent.code === '40001') {
      return res.status(409).json({ error: 'Booking conflict — please try again' });
    }
    next(error);
  }
});

// PUT /api/reservations/:id
router.put('/:id', authenticate, tenantScope, [
  body('status').optional().isIn(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']),
  body('checkIn').optional().isDate(),
  body('checkOut').optional().isDate(),
  body('totalAmount').optional().isFloat({ min: 0 }),
  body('paidAmount').optional().isFloat({ min: 0 }),
  body('adults').optional().isInt({ min: 1 }),
  body('children').optional().isInt({ min: 0 }),
  body('source').optional().isIn(['walk_in', 'phone', 'website', 'booking_com', 'airbnb', 'other']),
], async (req, res, next) => {
  const t = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE });
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const reservation = await Reservation.findOne({ where: { id: req.params.id, propertyId: req.propertyId }, transaction: t });
    if (!reservation) {
      await t.rollback();
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const { status, checkIn, checkOut, totalAmount, adults, children, specialRequests, source, paidAmount } = req.body;

    // Validate status transition if status is being changed
    if (status && status !== reservation.status) {
      const allowedTransitions = VALID_RESERVATION_TRANSITIONS[reservation.status] || [];
      if (!allowedTransitions.includes(status)) {
        await t.rollback();
        return res.status(400).json({
          error: `Cannot transition from '${reservation.status}' to '${status}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
        });
      }
    }

    // Validate checkOut > checkIn (use new values or fall back to existing)
    const effectiveCheckIn = checkIn || reservation.checkIn;
    const effectiveCheckOut = checkOut || reservation.checkOut;
    if (new Date(effectiveCheckOut) <= new Date(effectiveCheckIn)) {
      await t.rollback();
      return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    // If dates are changing, re-validate double-booking
    if (checkIn || checkOut) {
      const overlap = await Reservation.findOne({
        where: {
          roomId: reservation.roomId,
          id: { [Op.ne]: reservation.id },
          status: { [Op.notIn]: ['cancelled', 'checked_out', 'no_show'] },
          checkIn: { [Op.lt]: effectiveCheckOut },
          checkOut: { [Op.gt]: effectiveCheckIn },
        },
        transaction: t,
      });
      if (overlap) {
        await t.rollback();
        return res.status(409).json({ error: 'Room is already booked for the updated dates' });
      }
    }

    // Handle status transitions that affect room status
    if (status === 'checked_in') {
      await Room.update({ status: 'occupied' }, { where: { id: reservation.roomId }, transaction: t });
    } else if (status === 'checked_out' || status === 'cancelled') {
      await Room.update({ status: 'available' }, { where: { id: reservation.roomId }, transaction: t });
    }

    await reservation.update(
      { status, checkIn, checkOut, totalAmount, adults, children, specialRequests, source, paidAmount },
      { transaction: t }
    );

    await t.commit();

    const full = await Reservation.findByPk(reservation.id, {
      include: [
        { model: Guest, as: 'guest' },
        { model: Room, as: 'room' },
      ],
    });

    // Real-time: notify status change
    websocketService.emitReservationStatusChange(full.toJSON());
    websocketService.emitDashboardRefresh();
    await AuditLog.log({ userId: req.user.id, action: 'update', entityType: 'Reservation', entityId: reservation.id, req });

    // Send email notifications on key status transitions
    if (status && full.guest?.email) {
      if (status === 'confirmed') {
        emailService.sendReservationConfirmation({
          to: full.guest.email,
          firstName: full.guest.firstName,
          reservationId: full.id,
          checkIn: full.checkIn,
          checkOut: full.checkOut,
          roomNumber: full.room?.roomNumber || 'TBD',
          roomType: full.room?.type || '',
          totalAmount: full.totalAmount,
          hotelName: process.env.HOTEL_NAME,
        }).catch(err => logger.error('Reservation confirmation email failed', { reservationId: full.id, error: err.message }));
      } else if (status === 'checked_out') {
        emailService.sendCheckoutSummary({
          to: full.guest.email,
          firstName: full.guest.firstName,
          reservationId: full.id,
          checkIn: full.checkIn,
          checkOut: full.checkOut,
          roomNumber: full.room?.roomNumber || 'TBD',
          totalAmount: full.totalAmount,
          paidAmount: full.paidAmount,
          hotelName: process.env.HOTEL_NAME,
        }).catch(err => logger.error('Checkout summary email failed', { reservationId: full.id, error: err.message }));
      }
    }

    res.json(full);
  } catch (error) {
    await t.rollback();
    if (error.parent && error.parent.code === '40001') {
      return res.status(409).json({ error: 'Booking conflict — please try again' });
    }
    next(error);
  }
});

// POST /api/reservations/checkin-by-qr — Scan guest QR code and auto-check-in their today's reservation
router.post('/checkin-by-qr', authenticate, tenantScope, async (req, res, next) => {
  const t = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE });
  try {
    const { qrToken } = req.body;
    if (!qrToken || qrToken.trim().length !== 64) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid QR token format' });
    }

    // 1. Find the guest globally by QR token
    const sourceGuest = await Guest.findOne({ where: { qrToken: qrToken.trim() }, transaction: t });
    if (!sourceGuest) {
      await t.rollback();
      return res.status(404).json({ error: 'No guest found with this QR code' });
    }

    // 2. Find or import guest into this property
    let localGuest;
    if (sourceGuest.propertyId === req.propertyId) {
      localGuest = sourceGuest;
    } else {
      localGuest = await Guest.findOne({
        where: { phone: sourceGuest.phone, propertyId: req.propertyId },
        transaction: t,
      });
      if (localGuest) {
        await localGuest.update({
          firstName: sourceGuest.firstName,
          lastName: sourceGuest.lastName,
          email: sourceGuest.email,
          idType: sourceGuest.idType,
          idNumber: sourceGuest.idNumber,
          nationality: sourceGuest.nationality,
          address: sourceGuest.address,
          dateOfBirth: sourceGuest.dateOfBirth,
        }, { transaction: t });
      } else {
        localGuest = await Guest.create({
          firstName: sourceGuest.firstName,
          lastName: sourceGuest.lastName,
          phone: sourceGuest.phone,
          email: sourceGuest.email,
          idType: sourceGuest.idType,
          idNumber: sourceGuest.idNumber,
          nationality: sourceGuest.nationality,
          address: sourceGuest.address,
          dateOfBirth: sourceGuest.dateOfBirth,
          propertyId: req.propertyId,
        }, { transaction: t });
      }
    }

    // 3. Find today's reservation for this guest (pending or confirmed)
    // Use property timezone to determine "today" correctly
    const property = await Property.findByPk(req.propertyId, { attributes: ['timezone'], transaction: t });
    const tz = property?.timezone || 'UTC';
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD format
    const finalReservation = await Reservation.findOne({
      where: {
        guestId: localGuest.id,
        propertyId: req.propertyId,
        checkIn: { [Op.lte]: today },
        checkOut: { [Op.gt]: today },
        status: { [Op.in]: ['pending', 'confirmed'] },
      },
      include: [
        { model: Room, as: 'room', attributes: ['id', 'roomNumber', 'type', 'price'] },
      ],
      order: [['checkIn', 'ASC']],
      transaction: t,
    });

    if (!finalReservation) {
      await t.rollback();
      return res.status(404).json({
        error: 'No reservation found for today',
        guest: localGuest,
        message: 'Guest found but has no reservation for today. You can create a new reservation manually.',
      });
    }

    // 4. Auto check-in: update reservation status + room status
    await finalReservation.update({ status: 'checked_in' }, { transaction: t });
    await Room.update({ status: 'occupied' }, { where: { id: finalReservation.roomId }, transaction: t });

    await t.commit();

    // Re-fetch with full associations
    const full = await Reservation.findByPk(finalReservation.id, {
      include: [
        { model: Guest, as: 'guest' },
        { model: Room, as: 'room' },
      ],
    });

    websocketService.emitReservationStatusChange(full.toJSON());
    websocketService.emitDashboardRefresh();
    await AuditLog.log({ userId: req.user.id, action: 'update', entityType: 'Reservation', entityId: finalReservation.id, req });

    res.json({
      message: 'Guest checked in successfully',
      reservation: full,
      guest: localGuest,
    });
  } catch (error) {
    await t.rollback();
    if (error.parent && error.parent.code === '40001') {
      return res.status(409).json({ error: 'Check-in conflict — please try again' });
    }
    next(error);
  }
});

// DELETE /api/reservations/:id
router.delete('/:id', authenticate, authorize('admin', 'manager'), tenantScope, async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const reservation = await Reservation.findOne({ where: { id: req.params.id, propertyId: req.propertyId }, transaction: t });
    if (!reservation) {
      await t.rollback();
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Free the room if it was reserved/occupied by this reservation
    if (['pending', 'confirmed', 'checked_in'].includes(reservation.status)) {
      await Room.update({ status: 'available' }, { where: { id: reservation.roomId }, transaction: t });
    }

    await reservation.destroy({ transaction: t });
    await t.commit();
    await AuditLog.log({ userId: req.user.id, action: 'delete', entityType: 'Reservation', entityId: req.params.id, req });
    websocketService.emitDashboardRefresh();
    res.json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    await t.rollback();
    next(error);
  }
});

module.exports = router;
