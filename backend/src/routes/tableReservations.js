const router = require('express').Router();
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const { TableReservation, RestaurantTable, Guest, Property } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');

const VALID_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['seated', 'cancelled', 'no_show'],
  seated: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

// GET /api/table-reservations — List all table reservations for the property
router.get('/', authenticate, tenantScope, async (req, res, next) => {
  try {
    const { status, date, from, to, page = 1, limit = 20, search } = req.query;
    const where = { propertyId: req.propertyId };

    if (status) where.status = status;
    if (date) where.reservationDate = date;
    if (from) where.reservationDate = { ...where.reservationDate, [Op.gte]: from };
    if (to) where.reservationDate = { ...where.reservationDate, [Op.lte]: to };

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const include = [
      { model: RestaurantTable, as: 'table', attributes: ['id', 'tableNumber', 'capacity', 'location'] },
      { model: Guest, as: 'guest', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
    ];

    // If searching, join guest and filter by name/email
    if (search) {
      include[1].where = {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ],
      };
      include[1].required = true;
    }

    const { count, rows } = await TableReservation.findAndCountAll({
      where,
      include,
      order: [['reservationDate', 'DESC'], ['reservationTime', 'ASC']],
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

// PUT /api/table-reservations/:id — Update table reservation (status, etc.)
router.put('/:id', authenticate, authorize('admin', 'manager', 'staff'), tenantScope, async (req, res, next) => {
  try {
    const reservation = await TableReservation.findOne({
      where: { id: req.params.id, propertyId: req.propertyId },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Table reservation not found.' });
    }

    const { status, specialRequests } = req.body;

    if (status && status !== reservation.status) {
      const allowed = VALID_STATUS_TRANSITIONS[reservation.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: `Cannot change status from '${reservation.status}' to '${status}'.`,
          allowedTransitions: allowed,
        });
      }
      reservation.status = status;
    }

    if (specialRequests !== undefined) {
      reservation.specialRequests = specialRequests;
    }

    await reservation.save();

    const result = await TableReservation.findByPk(reservation.id, {
      include: [
        { model: RestaurantTable, as: 'table', attributes: ['id', 'tableNumber', 'capacity', 'location'] },
        { model: Guest, as: 'guest', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
      ],
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/table-reservations/:id — Cancel a table reservation
router.delete('/:id', authenticate, authorize('admin', 'manager'), tenantScope, async (req, res, next) => {
  try {
    const reservation = await TableReservation.findOne({
      where: { id: req.params.id, propertyId: req.propertyId },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Table reservation not found.' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    res.json({ message: 'Table reservation cancelled.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
