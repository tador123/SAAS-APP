const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const { Order, RestaurantTable, Guest } = require('../models');
const { Op } = require('sequelize');

// GET active kitchen orders (confirmed/preparing/ready — not pending, which hasn't been confirmed yet)
router.get('/orders', authenticate, tenantScope, async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: {
        propertyId: req.propertyId,
        status: { [Op.in]: ['confirmed', 'preparing', 'ready'] },
      },
      include: [
        { model: RestaurantTable, as: 'table', attributes: ['id', 'tableNumber'] },
        { model: Guest, as: 'guest', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [
        ['status', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    res.json({ data: orders });
  } catch (error) { next(error); }
});

// GET kitchen stats (counts by status — only confirmed+)
router.get('/stats', authenticate, tenantScope, async (req, res, next) => {
  try {
    const [confirmed, preparing, ready] = await Promise.all([
      Order.count({ where: { propertyId: req.propertyId, status: 'confirmed' } }),
      Order.count({ where: { propertyId: req.propertyId, status: 'preparing' } }),
      Order.count({ where: { propertyId: req.propertyId, status: 'ready' } }),
    ]);

    res.json({ confirmed, preparing, ready, total: confirmed + preparing + ready });
  } catch (error) { next(error); }
});

module.exports = router;
