const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const { Room, Reservation, Order, Invoice, Guest } = require('../models');
const { authenticate } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const cacheMiddleware = require('../middleware/cache');

// GET /api/dashboard/stats (cached 60s)
router.get('/stats', authenticate, tenantScope, cacheMiddleware(60), async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const pid = { propertyId: req.propertyId };

    const [
      totalRooms,
      occupiedRooms,
      availableRooms,
      totalGuests,
      todayCheckIns,
      todayCheckOuts,
      activeOrders,
      pendingInvoices,
    ] = await Promise.all([
      Room.count({ where: { ...pid } }),
      Room.count({ where: { ...pid, status: 'occupied' } }),
      Room.count({ where: { ...pid, status: 'available' } }),
      Guest.count({ where: { ...pid } }),
      Reservation.count({ where: { ...pid, checkIn: today, status: { [Op.in]: ['confirmed', 'checked_in'] } } }),
      Reservation.count({ where: { ...pid, checkOut: today, status: 'checked_in' } }),
      Order.count({ where: { ...pid, status: { [Op.in]: ['pending', 'confirmed', 'preparing', 'ready'] } } }),
      Invoice.count({ where: { ...pid, status: 'pending' } }),
    ]);

    // Revenue this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Invoice.sum('total', {
      where: {
        ...pid,
        status: 'paid',
        paidAt: { [Op.gte]: startOfMonth },
      },
    });

    // Revenue today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const dailyRevenue = await Invoice.sum('total', {
      where: {
        ...pid,
        status: 'paid',
        paidAt: { [Op.gte]: startOfDay },
      },
    });

    res.json({
      totalRooms,
      occupiedRooms,
      availableRooms,
      occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      totalGuests,
      todayCheckIns,
      todayCheckOuts,
      activeOrders,
      pendingInvoices,
      monthlyRevenue: monthlyRevenue || 0,
      dailyRevenue: dailyRevenue || 0,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/recent-reservations
router.get('/recent-reservations', authenticate, tenantScope, async (req, res, next) => {
  try {
    const reservations = await Reservation.findAll({
      where: { propertyId: req.propertyId },
      include: [
        { model: Guest, as: 'guest', attributes: ['firstName', 'lastName'] },
        { model: Room, as: 'room', attributes: ['roomNumber', 'type'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });
    res.json(reservations);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/recent-orders
router.get('/recent-orders', authenticate, tenantScope, async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: { propertyId: req.propertyId },
      include: [
        { model: Guest, as: 'guest', attributes: ['firstName', 'lastName'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/revenue-chart
router.get('/revenue-chart', authenticate, tenantScope, async (req, res, next) => {
  try {
    const results = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

      const dayRevenue = await Invoice.sum('total', {
        where: {
          propertyId: req.propertyId,
          status: 'paid',
          paidAt: { [Op.between]: [dayStart, dayEnd] },
        },
      });

      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      results.push({ day: dayName, revenue: dayRevenue || 0 });
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
