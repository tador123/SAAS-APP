const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Invoice, Guest, Reservation, AuditLog, sequelize } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const { requireFeature } = require('../middleware/subscription');
const websocketService = require('../services/websocketService');

// Valid invoice status transitions
const VALID_INVOICE_TRANSITIONS = {
  draft: ['pending', 'void'],
  pending: ['paid', 'overdue', 'void'],
  overdue: ['paid', 'void'],
  paid: ['refunded'],
  void: [],
  refunded: [],
};

// Generate invoice number using DB sequence (safe for concurrency and multi-instance)
const generateInvoiceNumber = async (transaction) => {
  const [[{ nextval }]] = await sequelize.query(
    `SELECT nextval('invoice_number_seq')`,
    { transaction }
  );
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${datePart}-${nextval.toString().padStart(4, '0')}`;
};

// Compute invoice totals server-side
const computeInvoiceTotals = (items, taxRate = 0, discount = 0) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('Items must be a non-empty array'), { statusCode: 400 });
  }

  let subtotal = 0;
  const validatedItems = items.map((item, index) => {
    if (!item.description || typeof item.description !== 'string' || !item.description.trim()) {
      throw Object.assign(new Error(`Item at index ${index}: description is required`), { statusCode: 400 });
    }
    if (!item.quantity || item.quantity < 1) {
      throw Object.assign(new Error(`Item at index ${index}: quantity must be >= 1`), { statusCode: 400 });
    }
    if (item.unitPrice == null || parseFloat(item.unitPrice) < 0) {
      throw Object.assign(new Error(`Item at index ${index}: unitPrice must be >= 0`), { statusCode: 400 });
    }

    const lineTotal = parseFloat(item.unitPrice) * item.quantity;
    subtotal += lineTotal;

    return {
      description: item.description.trim(),
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
      total: parseFloat(lineTotal.toFixed(2)),
    };
  });

  const taxAmount = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
  const discountAmount = parseFloat(discount) || 0;
  const total = parseFloat((subtotal + taxAmount - discountAmount).toFixed(2));

  return { validatedItems, subtotal: parseFloat(subtotal.toFixed(2)), tax: taxAmount, discount: discountAmount, total };
};

// GET /api/invoices
router.get('/', authenticate, tenantScope, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = { propertyId: req.propertyId };
    if (status) where.status = status;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [
        { model: Guest, as: 'guest', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Reservation, as: 'reservation', attributes: ['id', 'checkIn', 'checkOut'] },
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

// GET /api/invoices/:id
router.get('/:id', authenticate, tenantScope, async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, propertyId: req.propertyId },
      include: [
        { model: Guest, as: 'guest' },
        { model: Reservation, as: 'reservation' },
      ],
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// POST /api/invoices
router.post('/', authenticate, tenantScope, requireFeature('invoices'), [
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.description').trim().notEmpty().withMessage('Each item must have a description'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item must have quantity >= 1'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Each item must have unitPrice >= 0'),
  body('guestId').optional({ nullable: true }).isInt(),
  body('reservationId').optional({ nullable: true }).isInt(),
  body('dueDate').optional({ nullable: true }).isDate(),
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

    const { items, guestId, reservationId, dueDate, notes, taxRate, discount } = req.body;

    // Compute totals server-side
    const { validatedItems, subtotal, tax, discount: disc, total } = computeInvoiceTotals(
      items, taxRate || 0, discount || 0
    );

    const invoiceData = {
      items: validatedItems, subtotal, total, tax, discount: disc,
      guestId, reservationId, dueDate, notes,
      invoiceNumber: await generateInvoiceNumber(t),
      propertyId: req.propertyId,
    };

    const invoice = await Invoice.create(invoiceData, { transaction: t });
    await t.commit();

    const full = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Guest, as: 'guest' },
        { model: Reservation, as: 'reservation' },
      ],
    });

    // Real-time: notify dashboards
    websocketService.emitInvoiceEvent('created', full.toJSON());
    websocketService.emitDashboardRefresh();
    await AuditLog.log({ userId: req.user.id, action: 'create', entityType: 'Invoice', entityId: full.id, req });

    res.status(201).json(full);
  } catch (error) {
    await t.rollback();
    next(error);
  }
});

// PUT /api/invoices/:id
router.put('/:id', authenticate, tenantScope, [
  body('items').optional().isArray({ min: 1 }),
  body('items.*.description').optional().trim().notEmpty(),
  body('items.*.quantity').optional().isInt({ min: 1 }),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }),
  body('discount').optional().isFloat({ min: 0 }),
  body('dueDate').optional({ nullable: true }).isDate(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const invoice = await Invoice.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (['paid', 'void', 'refunded'].includes(invoice.status)) {
      return res.status(400).json({ error: `Cannot edit an invoice with status '${invoice.status}'` });
    }

    const updateData = { dueDate: req.body.dueDate, notes: req.body.notes };

    // If items are updated, recompute totals
    if (req.body.items) {
      const { validatedItems, subtotal, tax, discount, total } = computeInvoiceTotals(
        req.body.items, req.body.taxRate || 0, req.body.discount || 0
      );
      updateData.items = validatedItems;
      updateData.subtotal = subtotal;
      updateData.tax = tax;
      updateData.discount = discount;
      updateData.total = total;
    }

    await invoice.update(updateData);

    const full = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Guest, as: 'guest' },
        { model: Reservation, as: 'reservation' },
      ],
    });

    await AuditLog.log({ userId: req.user.id, action: 'update', entityType: 'Invoice', entityId: invoice.id, req });

    res.json(full);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/invoices/:id/pay
router.patch('/:id/pay', authenticate, tenantScope, [
  body('paymentMethod').isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'online', 'other'])
    .withMessage('Valid payment method is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const invoice = await Invoice.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (!['pending', 'overdue'].includes(invoice.status)) {
      return res.status(400).json({ error: `Cannot mark invoice as paid when status is '${invoice.status}'` });
    }

    await invoice.update({
      status: 'paid',
      paymentMethod: req.body.paymentMethod,
      paidAt: new Date(),
    });

    websocketService.emitInvoiceEvent('paid', invoice.toJSON());
    websocketService.emitDashboardRefresh();
    await AuditLog.log({ userId: req.user.id, action: 'status_change', entityType: 'Invoice', entityId: invoice.id, changes: { status: 'paid' }, req });

    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/invoices/:id/void
router.patch('/:id/void', authenticate, authorize('admin', 'manager'), tenantScope, async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, propertyId: req.propertyId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await invoice.update({ status: 'void' });
    websocketService.emitInvoiceEvent('void', invoice.toJSON());
    websocketService.emitDashboardRefresh();
    await AuditLog.log({ userId: req.user.id, action: 'status_change', entityType: 'Invoice', entityId: invoice.id, changes: { status: 'void' }, req });
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
