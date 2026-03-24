const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { MenuCategory, MenuItem, RestaurantTable, TableReservation, Property } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const { checkTableLimit } = require('../middleware/subscription');
const cacheMiddleware = require('../middleware/cache');
const cacheService = require('../services/cacheService');

// ===== MENU CATEGORIES =====

// GET /api/restaurant/categories (cached 5 min)
router.get('/categories', authenticate, tenantScope, cacheMiddleware(300, () => 'menu:categories'), async (req, res, next) => {
  try {
    const categories = await MenuCategory.findAll({
      where: { propertyId: req.propertyId },
      include: [{ model: MenuItem, as: 'items' }],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// POST /api/restaurant/categories
router.post('/categories', authenticate, authorize('admin', 'manager'), tenantScope, [
  body('name').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { name, description, sortOrder, isActive } = req.body;
    const category = await MenuCategory.create({ name, description, sortOrder, isActive, propertyId: req.propertyId });
    await cacheService.del('menu:categories');
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// PUT /api/restaurant/categories/:id
router.put('/categories/:id', authenticate, authorize('admin', 'manager'), tenantScope, [
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const category = await MenuCategory.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const { name, description, sortOrder, isActive } = req.body;
    await category.update({ name, description, sortOrder, isActive });
    await cacheService.del('menu:categories');
    res.json(category);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/restaurant/categories/:id
router.delete('/categories/:id', authenticate, authorize('admin'), tenantScope, async (req, res, next) => {
  try {
    const category = await MenuCategory.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    await category.destroy();
    await cacheService.del('menu:categories');
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ===== MENU ITEMS =====

// GET /api/restaurant/menu-items (cached 5 min)
router.get('/menu-items', authenticate, tenantScope, cacheMiddleware(300), async (req, res, next) => {
  try {
    const { categoryId, available } = req.query;
    const where = { propertyId: req.propertyId };
    if (categoryId) where.categoryId = categoryId;
    if (available !== undefined) where.isAvailable = available === 'true';

    const items = await MenuItem.findAll({
      where,
      include: [{ model: MenuCategory, as: 'category', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// POST /api/restaurant/menu-items
router.post('/menu-items', authenticate, authorize('admin', 'manager', 'chef'), tenantScope, [
  body('name').trim().notEmpty(),
  body('categoryId').isInt(),
  body('price').isFloat({ min: 0 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { name, categoryId, price, description, preparationTime, isVegetarian, isVegan, isAvailable, image } = req.body;
    const item = await MenuItem.create({ name, categoryId, price, description, preparationTime, isVegetarian, isVegan, isAvailable, image, propertyId: req.propertyId });
    await cacheService.del('http:*/restaurant/menu-items*');
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// PUT /api/restaurant/menu-items/:id
router.put('/menu-items/:id', authenticate, authorize('admin', 'manager', 'chef'), tenantScope, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('categoryId').optional().isInt().withMessage('Category ID must be an integer'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('preparationTime').optional().isInt({ min: 0 }).withMessage('Preparation time must be a non-negative integer'),
  body('isVegetarian').optional().isBoolean().withMessage('isVegetarian must be a boolean'),
  body('isVegan').optional().isBoolean().withMessage('isVegan must be a boolean'),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const item = await MenuItem.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });

    const { name, categoryId, price, description, preparationTime, isVegetarian, isVegan, isAvailable, image } = req.body;
    await item.update({ name, categoryId, price, description, preparationTime, isVegetarian, isVegan, isAvailable, image });
    await cacheService.del('http:*/restaurant/menu-items*');
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/restaurant/menu-items/:id
router.delete('/menu-items/:id', authenticate, authorize('admin', 'manager'), tenantScope, async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });

    await item.destroy();
    await cacheService.del('http:*/restaurant/menu-items*');
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ===== RESTAURANT TABLES =====

// GET /api/restaurant/tables
router.get('/tables', authenticate, tenantScope, async (req, res, next) => {
  try {
    const tables = await RestaurantTable.findAll({ where: { propertyId: req.propertyId }, order: [['tableNumber', 'ASC']] });

    // Get today's and upcoming active reservations to compute effective status
    const property = await Property.findByPk(req.propertyId, { attributes: ['timezone'] });
    const tz = property?.timezone || 'UTC';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });

    const activeReservations = await TableReservation.findAll({
      where: {
        propertyId: req.propertyId,
        reservationDate: { [Op.gte]: today },
        status: { [Op.in]: ['confirmed', 'seated', 'pending'] },
      },
      attributes: ['tableId', 'status', 'reservationDate'],
    });

    // Build a map of tableId -> effective status (prioritise today, then nearest future)
    const tableStatusMap = {};
    for (const r of activeReservations) {
      const current = tableStatusMap[r.tableId];
      // seated (today only) > confirmed > pending
      if (r.status === 'seated') {
        tableStatusMap[r.tableId] = 'seated';
      } else if (!current || current === 'pending') {
        tableStatusMap[r.tableId] = r.status;
      }
    }

    const enriched = tables.map(t => {
      const json = t.toJSON();
      const reservationStatus = tableStatusMap[t.id];
      if (reservationStatus === 'seated') {
        json.status = 'occupied';
      } else if (reservationStatus === 'confirmed' || reservationStatus === 'pending') {
        json.status = json.status === 'available' ? 'reserved' : json.status;
      }
      return json;
    });

    res.json(enriched);
  } catch (error) {
    next(error);
  }
});

// POST /api/restaurant/tables
router.post('/tables', authenticate, authorize('admin', 'manager'), tenantScope, checkTableLimit, [
  body('tableNumber').trim().notEmpty(),
  body('capacity').isInt({ min: 1 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { tableNumber, capacity, location, status } = req.body;
    const table = await RestaurantTable.create({ tableNumber, capacity, location, status, propertyId: req.propertyId });
    res.status(201).json(table);
  } catch (error) {
    next(error);
  }
});

// PUT /api/restaurant/tables/:id
router.put('/tables/:id', authenticate, authorize('admin', 'manager'), tenantScope, [
  body('tableNumber').optional().trim().notEmpty().withMessage('Table number cannot be empty'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('status').optional().isIn(['available', 'occupied', 'reserved', 'cleaning']).withMessage('Invalid table status'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const table = await RestaurantTable.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const { tableNumber, capacity, location, status } = req.body;
    await table.update({ tableNumber, capacity, location, status });
    res.json(table);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/restaurant/tables/:id
router.delete('/tables/:id', authenticate, authorize('admin'), tenantScope, async (req, res, next) => {
  try {
    const table = await RestaurantTable.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!table) return res.status(404).json({ error: 'Table not found' });

    await table.destroy();
    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
