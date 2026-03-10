const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { Invoice, Guest, Reservation, Room } = require('../models');
const emailService = require('../services/emailService');

// POST /api/notifications/send-invoice — Email an invoice to the guest
router.post('/send-invoice', authenticate, authorize('admin', 'manager', 'receptionist'), async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ error: 'invoiceId is required.' });

    const invoice = await Invoice.findByPk(invoiceId, {
      include: [{ model: Guest, as: 'guest' }],
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
    if (!invoice.guest?.email) return res.status(400).json({ error: 'Guest has no email address.' });

    await emailService.sendInvoice({
      to: invoice.guest.email,
      firstName: invoice.guest.firstName,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.total,
      dueDate: invoice.dueDate,
      items: invoice.items,
    });

    res.json({ message: `Invoice ${invoice.invoiceNumber} emailed to ${invoice.guest.email}.` });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/send-checkin-reminder — Manually send a check-in reminder
router.post('/send-checkin-reminder', authenticate, authorize('admin', 'manager', 'receptionist'), async (req, res, next) => {
  try {
    const { reservationId } = req.body;
    if (!reservationId) return res.status(400).json({ error: 'reservationId is required.' });

    const reservation = await Reservation.findByPk(reservationId, {
      include: [
        { model: Guest, as: 'guest' },
        { model: Room, as: 'room' },
      ],
    });
    if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
    if (!reservation.guest?.email) return res.status(400).json({ error: 'Guest has no email address.' });

    await emailService.sendCheckInReminder({
      to: reservation.guest.email,
      firstName: reservation.guest.firstName,
      reservationId: reservation.id,
      checkInDate: reservation.checkIn,
      roomNumber: reservation.room?.roomNumber || 'TBD',
      hotelName: process.env.HOTEL_NAME || 'HotelSaaS',
    });

    res.json({ message: `Check-in reminder sent to ${reservation.guest.email}.` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
