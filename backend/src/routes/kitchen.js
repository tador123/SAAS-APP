const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const { Order, RestaurantTable, Guest, MenuItem, MenuCategory } = require('../models');
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

    // Enrich items with category name for orders that don't already have it
    const allMenuItemIds = new Set();
    for (const order of orders) {
      for (const item of (order.items || [])) {
        if (!item.categoryName && item.menuItemId) allMenuItemIds.add(item.menuItemId);
      }
    }
    let categoryMap = new Map();
    if (allMenuItemIds.size > 0) {
      const menuItems = await MenuItem.findAll({
        where: { id: [...allMenuItemIds] },
        include: [{ model: MenuCategory, as: 'category', attributes: ['name'] }],
        attributes: ['id'],
      });
      categoryMap = new Map(menuItems.map(mi => [mi.id, mi.category?.name || '']));
    }
    const enriched = orders.map(o => {
      const json = o.toJSON();
      json.items = (json.items || []).map(item => ({
        ...item,
        categoryName: item.categoryName || categoryMap.get(item.menuItemId) || '',
      }));
      return json;
    });

    res.json({ data: enriched });
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
