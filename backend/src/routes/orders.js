const router = require('express').Router();
const { body, param, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Order, RestaurantTable, Guest, MenuItem, MenuCategory, AuditLog, sequelize } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const websocketService = require('../services/websocketService');
const emailService = require('../services/emailService');

// Valid order status transitions
const VALID_ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: ['completed'],
  completed: [],
  cancelled: [],
};

// Generate order number using DB sequence (safe for concurrency and multi-instance)
const generateOrderNumber = async (transaction) => {
  const [[{ nextval }]] = await sequelize.query(
    `SELECT nextval('order_number_seq')`,
    { transaction }
  );
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${datePart}-${nextval.toString().padStart(4, '0')}`;
};

// Compute totals server-side from menu item prices
const computeOrderTotals = async (items, taxRate = 0, discount = 0) => {
  // Validate item structure
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('Items must be a non-empty array'), { statusCode: 400 });
  }

  const menuItemIds = items.map(i => i.menuItemId);
  const menuItems = await MenuItem.findAll({
    where: { id: menuItemIds },
    include: [{ model: MenuCategory, as: 'category', attributes: ['id', 'name'] }],
  });
  const menuItemMap = new Map(menuItems.map(mi => [mi.id, mi]));

  let subtotal = 0;
  const validatedItems = items.map((item, index) => {
    if (!item.menuItemId || !item.quantity || item.quantity < 1) {
      throw Object.assign(
        new Error(`Item at index ${index}: menuItemId and quantity (>=1) are required`),
        { statusCode: 400 }
      );
    }

    const menuItem = menuItemMap.get(item.menuItemId);
    if (!menuItem) {
      throw Object.assign(
        new Error(`Menu item with id ${item.menuItemId} not found`),
        { statusCode: 400 }
      );
    }

    if (!menuItem.isAvailable) {
      throw Object.assign(
        new Error(`Menu item '${menuItem.name}' is currently unavailable`),
        { statusCode: 400 }
      );
    }

    const lineTotal = parseFloat(menuItem.price) * item.quantity;
    subtotal += lineTotal;

    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      categoryName: menuItem.category?.name || '',
      quantity: item.quantity,
      price: parseFloat(menuItem.price),
      notes: item.notes || '',
      lineTotal,
    };
  });

  const taxAmount = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
  const discountAmount = parseFloat(discount) || 0;
  const total = parseFloat((subtotal + taxAmount - discountAmount).toFixed(2));

  return { validatedItems, subtotal: parseFloat(subtotal.toFixed(2)), tax: taxAmount, discount: discountAmount, total };
};

// GET /api/orders
router.get('/', authenticate, tenantScope, async (req, res, next) => {
  try {
    const { status, orderType, page = 1, limit = 20 } = req.query;
    const where = { propertyId: req.propertyId };
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: RestaurantTable, as: 'table', attributes: ['id', 'tableNumber'] },
        { model: Guest, as: 'guest', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['createdAt', 'DESC']],
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

// GET /api/orders/:id
router.get('/:id', authenticate, tenantScope, async (req, res, next) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, propertyId: req.propertyId },
      include: [
        { model: RestaurantTable, as: 'table' },
        { model: Guest, as: 'guest' },
      ],
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// POST /api/orders
router.post('/', authenticate, tenantScope, [
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.menuItemId').isInt({ min: 1 }).withMessage('Each item must have a valid menuItemId'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item must have quantity >= 1'),
  body('orderType').optional().isIn(['dine_in', 'room_service', 'takeaway']).withMessage('Invalid order type'),
  body('tableId').optional({ nullable: true }).isInt(),
  body('guestId').optional({ nullable: true }).isInt(),
  body('reservationId').optional({ nullable: true }).isInt(),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }),
  body('discount').optional().isFloat({ min: 0 }),
], async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { items, notes, tableId, guestId, reservationId, orderType, taxRate, discount } = req.body;

    // Compute totals server-side from actual menu item prices
    const { validatedItems, subtotal, tax, discount: disc, total } = await computeOrderTotals(
      items, taxRate || 0, discount || 0
    );

    const orderData = {
      items: validatedItems, subtotal, total, tax, discount: disc, notes,
      tableId, guestId, reservationId, orderType,
      orderNumber: await generateOrderNumber(t),
      servedBy: req.user.id,
      propertyId: req.propertyId,
    };

    const order = await Order.create(orderData, { transaction: t });

    // Update table status if dine-in
    if (tableId && orderType === 'dine_in') {
      await RestaurantTable.update({ status: 'occupied' }, { where: { id: tableId }, transaction: t });
    }

    await t.commit();

    const full = await Order.findByPk(order.id, {
      include: [
        { model: RestaurantTable, as: 'table' },
        { model: Guest, as: 'guest' },
      ],
    });

    // Real-time: notify kitchen + dashboards
    websocketService.emitNewOrder(full.toJSON());
    websocketService.emitDashboardRefresh();

    // Audit log
    await AuditLog.log({ userId: req.user.id, action: 'create', entityType: 'Order', entityId: full.id, req });

    // Send order confirmation email if guest has email
    if (full.guest?.email) {
      emailService.sendOrderConfirmation({
        to: full.guest.email,
        firstName: full.guest.firstName,
        orderNumber: full.orderNumber,
        items: full.items,
        total: full.total,
      }).catch(err => require('../services/logger').error('Order confirmation email failed', { error: err.message }));
    }

    res.status(201).json(full);
  } catch (error) {
    await t.rollback();
    next(error);
  }
});

// PUT /api/orders/:id
router.put('/:id', authenticate, tenantScope, [
  body('items').optional().isArray({ min: 1 }),
  body('items.*.menuItemId').optional().isInt({ min: 1 }),
  body('items.*.quantity').optional().isInt({ min: 1 }),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }),
  body('discount').optional().isFloat({ min: 0 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const order = await Order.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Cannot edit completed/cancelled orders
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: `Cannot edit an order with status '${order.status}'` });
    }

    const updateData = { notes: req.body.notes };

    // If items are being updated, recompute totals server-side
    if (req.body.items) {
      const { validatedItems, subtotal, tax, discount, total } = await computeOrderTotals(
        req.body.items, req.body.taxRate || 0, req.body.discount || 0
      );
      updateData.items = validatedItems;
      updateData.subtotal = subtotal;
      updateData.tax = tax;
      updateData.discount = discount;
      updateData.total = total;
    }

    await order.update(updateData);

    const full = await Order.findByPk(order.id, {
      include: [
        { model: RestaurantTable, as: 'table' },
        { model: Guest, as: 'guest' },
      ],
    });

    // Real-time: notify kitchen of item changes
    websocketService.emitOrderUpdated(full.toJSON());
    await AuditLog.log({ userId: req.user.id, action: 'update', entityType: 'Order', entityId: order.id, req });

    res.json(full);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticate, tenantScope, [
  body('status').isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'])
    .withMessage('Invalid status value'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const order = await Order.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { status } = req.body;

    // Validate status transition
    const allowedTransitions = VALID_ORDER_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from '${order.status}' to '${status}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      });
    }

    await order.update({ status });

    // Real-time: notify kitchen + dashboards of status change
    websocketService.emitOrderStatusChange(order);
    websocketService.emitDashboardRefresh();
    await AuditLog.log({ userId: req.user.id, action: 'status_change', entityType: 'Order', entityId: order.id, changes: { status }, req });

    // Free up table when order is completed or cancelled (only if no other active orders)
    if ((status === 'completed' || status === 'cancelled') && order.tableId) {
      const otherActiveOrders = await Order.count({
        where: {
          tableId: order.tableId,
          id: { [Op.ne]: order.id },
          status: { [Op.notIn]: ['completed', 'cancelled'] },
        },
      });
      if (otherActiveOrders === 0) {
        await RestaurantTable.update({ status: 'available' }, { where: { id: order.tableId } });
      }
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/orders/:id
router.delete('/:id', authenticate, authorize('admin', 'manager'), tenantScope, async (req, res, next) => {
  try {
    const order = await Order.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Free table if needed
    if (order.tableId) {
      const otherActiveOrders = await Order.count({
        where: {
          tableId: order.tableId,
          id: { [Op.ne]: order.id },
          status: { [Op.notIn]: ['completed', 'cancelled'] },
        },
      });
      if (otherActiveOrders === 0) {
        await RestaurantTable.update({ status: 'available' }, { where: { id: order.tableId } });
      }
    }

    const orderId = order.id;
    await order.destroy();
    await AuditLog.log({ userId: req.user.id, action: 'delete', entityType: 'Order', entityId: orderId, req });
    websocketService.emitDashboardRefresh();
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
