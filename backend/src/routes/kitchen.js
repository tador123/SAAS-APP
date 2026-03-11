const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const { Order, RestaurantTable, Guest } = require('../models');
const { Op } = require('sequelize');

// GET active kitchen orders (pending/confirmed/preparing/ready)
router.get('/orders', authenticate, tenantScope, async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: {
        propertyId: req.propertyId,
        status: { [Op.in]: ['pending', 'confirmed', 'preparing', 'ready'] },
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

// GET kitchen stats (counts by status)
router.get('/stats', authenticate, tenantScope, async (req, res, next) => {
  try {
    const [pending, preparing, ready] = await Promise.all([
      Order.count({ where: { propertyId: req.propertyId, status: 'pending' } }),
      Order.count({ where: { propertyId: req.propertyId, status: 'preparing' } }),
      Order.count({ where: { propertyId: req.propertyId, status: 'ready' } }),
    ]);

    res.json({ pending, preparing, ready, total: pending + preparing + ready });
  } catch (error) { next(error); }
});

module.exports = router;
