const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');
const { Guest, Reservation, Order, Invoice, Room, sequelize } = require('../models');

// GET folio for a guest (aggregates room charges + restaurant orders + invoices)
router.get('/:guestId', authenticate, tenantScope, async (req, res, next) => {
  try {
    const guest = await Guest.findOne({
      where: { id: req.params.guestId, propertyId: req.propertyId },
    });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    // Active/recent reservations
    const reservations = await Reservation.findAll({
      where: { guestId: guest.id, propertyId: req.propertyId },
      include: [{ model: Room, as: 'room', attributes: ['id', 'roomNumber', 'type', 'price'] }],
      order: [['checkIn', 'DESC']],
      limit: 10,
    });

    // Restaurant orders
    const orders = await Order.findAll({
      where: { guestId: guest.id, propertyId: req.propertyId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    // Invoices
    const invoices = await Invoice.findAll({
      where: { guestId: guest.id, propertyId: req.propertyId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    // Compute totals
    const roomCharges = reservations.reduce((sum, r) => sum + parseFloat(r.totalAmount || 0), 0);
    const restaurantCharges = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    const invoiceTotal = invoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
    const paidTotal = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + parseFloat(i.total || 0), 0);

    // Generate folio number
    const [[{ nextval }]] = await sequelize.query(`SELECT nextval('folio_number_seq')`);
    const folioNumber = `FOL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(nextval).padStart(4, '0')}`;

    res.json({
      folioNumber,
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
      },
      reservations: reservations.map(r => ({
        id: r.id,
        room: r.room?.roomNumber,
        roomType: r.room?.type,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        nights: r.checkIn && r.checkOut
          ? Math.ceil((new Date(r.checkOut) - new Date(r.checkIn)) / 86400000)
          : 0,
        rate: parseFloat(r.room?.price || 0),
        total: parseFloat(r.totalAmount || 0),
        status: r.status,
      })),
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        items: o.items,
        total: parseFloat(o.total),
        date: o.createdAt,
        status: o.status,
      })),
      invoices: invoices.map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        total: parseFloat(i.total),
        status: i.status,
        paidAt: i.paidAt,
      })),
      summary: {
        roomCharges: parseFloat(roomCharges.toFixed(2)),
        restaurantCharges: parseFloat(restaurantCharges.toFixed(2)),
        totalCharges: parseFloat((roomCharges + restaurantCharges).toFixed(2)),
        totalInvoiced: parseFloat(invoiceTotal.toFixed(2)),
        totalPaid: parseFloat(paidTotal.toFixed(2)),
        balance: parseFloat((roomCharges + restaurantCharges - paidTotal).toFixed(2)),
      },
    });
  } catch (error) { next(error); }
});

module.exports = router;
