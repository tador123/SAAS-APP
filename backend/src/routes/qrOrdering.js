const router = require('express').Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const { RestaurantTable, MenuCategory, MenuItem, Order, sequelize } = require('../models');
const websocketService = require('../services/websocketService');

// ── Public endpoints (no auth — used by guests scanning QR) ──

// GET menu for a table by QR token
router.get('/menu/:token', async (req, res, next) => {
  try {
    const table = await RestaurantTable.findOne({
      where: { qrToken: req.params.token },
    });
    if (!table) return res.status(404).json({ error: 'Invalid QR code' });

    const categories = await MenuCategory.findAll({
      where: { propertyId: table.propertyId, isActive: true },
      include: [{
        model: MenuItem,
        as: 'items',
        where: { isAvailable: true },
        required: false,
      }],
      order: [['sortOrder', 'ASC'], [{ model: MenuItem, as: 'items' }, 'name', 'ASC']],
    });

    res.json({
      table: { id: table.id, tableNumber: table.tableNumber },
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        items: (c.items || []).map(i => ({
          id: i.id,
          name: i.name,
          description: i.description,
          price: parseFloat(i.price),
          image: i.image,
          preparationTime: i.preparationTime,
          isVegetarian: i.isVegetarian,
          isVegan: i.isVegan,
          isGlutenFree: i.isGlutenFree,
        })),
      })),
    });
  } catch (error) { next(error); }
});

// POST place order from QR menu (no auth)
router.post('/order/:token', [
  body('items').isArray({ min: 1 }),
  body('items.*.menuItemId').isInt({ min: 1 }),
  body('items.*.quantity').isInt({ min: 1, max: 50 }),
  body('guestName').optional().trim().escape(),
  body('notes').optional().trim().escape(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const table = await RestaurantTable.findOne({ where: { qrToken: req.params.token } });
    if (!table) return res.status(404).json({ error: 'Invalid QR code' });

    const { items, guestName, notes } = req.body;

    // Validate items and compute totals server-side
    const menuItemIds = items.map(i => i.menuItemId);
    const menuItems = await MenuItem.findAll({ where: { id: menuItemIds, propertyId: table.propertyId } });
    const menuItemMap = new Map(menuItems.map(mi => [mi.id, mi]));

    let subtotal = 0;
    const validatedItems = items.map(item => {
      const mi = menuItemMap.get(item.menuItemId);
      if (!mi) throw Object.assign(new Error(`Menu item ${item.menuItemId} not found`), { statusCode: 400 });
      const lineTotal = parseFloat(mi.price) * item.quantity;
      subtotal += lineTotal;
      return { menuItemId: mi.id, name: mi.name, quantity: item.quantity, price: parseFloat(mi.price), lineTotal };
    });

    const total = parseFloat(subtotal.toFixed(2));

    // Generate order number
    const [[{ nextval }]] = await sequelize.query(`SELECT nextval('order_number_seq')`);
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `QR-${datePart}-${nextval.toString().padStart(4, '0')}`;

    const order = await Order.create({
      orderNumber,
      tableId: table.id,
      items: validatedItems,
      orderType: 'dine_in',
      status: 'pending',
      subtotal: total,
      tax: 0,
      discount: 0,
      total,
      notes: [guestName ? `Guest: ${guestName}` : '', notes || ''].filter(Boolean).join(' | '),
      propertyId: table.propertyId,
    });

    websocketService.emitNewOrder(order);
    websocketService.emitDashboardRefresh();

    res.status(201).json({
      orderNumber: order.orderNumber,
      items: validatedItems,
      total,
      message: 'Order placed! Your food is being prepared.',
    });
  } catch (error) { next(error); }
});

// ── Authenticated endpoints (staff) ──

// POST generate QR token for a table
router.post('/generate/:tableId', authenticate, authorize('admin', 'manager'), tenantScope, async (req, res, next) => {
  try {
    const table = await RestaurantTable.findOne({
      where: { id: req.params.tableId, propertyId: req.propertyId },
    });
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const qrToken = crypto.randomBytes(32).toString('hex');
    await table.update({ qrToken });

    res.json({
      tableId: table.id,
      tableNumber: table.tableNumber,
      qrToken,
      qrUrl: `${req.protocol}://${req.get('host')}/qr/menu/${qrToken}`,
    });
  } catch (error) { next(error); }
});

// GET all tables with QR status
router.get('/tables', authenticate, tenantScope, async (req, res, next) => {
  try {
    const tables = await RestaurantTable.findAll({
      where: { propertyId: req.propertyId },
      order: [['tableNumber', 'ASC']],
    });

    res.json({
      data: tables.map(t => ({
        id: t.id,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        hasQR: !!t.qrToken,
        qrToken: t.qrToken,
        qrUrl: t.qrToken ? `${req.protocol}://${req.get('host')}/qr/menu/${t.qrToken}` : null,
      })),
    });
  } catch (error) { next(error); }
});

module.exports = router;
