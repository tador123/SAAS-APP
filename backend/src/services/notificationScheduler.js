const { Op } = require('sequelize');
const { Reservation, Guest, Room, Invoice, RefreshToken } = require('../models');
const emailService = require('./emailService');
const logger = require('./logger');

/**
 * NotificationScheduler — runs periodic tasks for email notifications.
 * Call `start()` once from index.js after DB is connected.
 */
class NotificationScheduler {
  constructor() {
    this.timers = [];
  }

  start() {
    logger.info('Notification scheduler started.');

    // Check-in reminders — run every hour
    this.timers.push(
      setInterval(() => this.sendCheckInReminders().catch(err => logger.error('Check-in reminder error', { error: err.message })), 60 * 60 * 1000)
    );

    // Overdue invoice reminders — run every 6 hours
    this.timers.push(
      setInterval(() => this.markOverdueInvoices().catch(err => logger.error('Overdue invoice error', { error: err.message })), 6 * 60 * 60 * 1000)
    );

    // Expired token cleanup — run every 12 hours
    this.timers.push(
      setInterval(() => this.cleanupExpiredTokens().catch(err => logger.error('Token cleanup error', { error: err.message })), 12 * 60 * 60 * 1000)
    );

    // Run once on startup (after a short delay)
    setTimeout(() => {
      this.sendCheckInReminders().catch(err => logger.error('Check-in reminder error', { error: err.message }));
      this.markOverdueInvoices().catch(err => logger.error('Overdue invoice error', { error: err.message }));
      this.cleanupExpiredTokens().catch(err => logger.error('Token cleanup error', { error: err.message }));
    }, 10_000);
  }

  stop() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  /**
   * Send check-in reminders to guests whose check-in is tomorrow
   * and whose status is 'confirmed'.
   */
  async sendCheckInReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    const reservations = await Reservation.findAll({
      where: {
        checkIn: tomorrowStr,
        status: 'confirmed',
      },
      include: [
        { model: Guest, as: 'guest' },
        { model: Room, as: 'room' },
      ],
    });

    let sent = 0;
    for (const reservation of reservations) {
      if (!reservation.guest?.email) continue;

      try {
        await emailService.sendCheckInReminder({
          to: reservation.guest.email,
          firstName: reservation.guest.firstName,
          reservationId: reservation.id,
          checkInDate: reservation.checkIn,
          roomNumber: reservation.room?.roomNumber || 'TBD',
          hotelName: process.env.HOTEL_NAME || 'HotelSaaS',
        });
        sent++;
      } catch (err) {
        logger.error('Failed to send check-in reminder', { reservationId: reservation.id, error: err.message });
      }
    }

    if (sent > 0) {
      logger.info('Sent check-in reminders', { count: sent, date: tomorrowStr });
    }
  }

  /**
   * Mark invoices past their due date as overdue.
   */
  async markOverdueInvoices() {
    const today = new Date().toISOString().split('T')[0];

    const [count] = await Invoice.update(
      { status: 'overdue' },
      {
        where: {
          status: 'pending',
          dueDate: { [Op.lt]: today },
        },
      }
    );

    if (count > 0) {
      logger.info('Marked invoices as overdue', { count });
    }
  }

  /**
   * Clean up expired and revoked refresh tokens.
   */
  async cleanupExpiredTokens() {
    try {
      const result = await RefreshToken.cleanupExpired();
      if (result > 0) {
        logger.info('Cleaned up expired refresh tokens', { count: result });
      }
    } catch (err) {
      logger.error('Token cleanup error', { error: err.message });
    }
  }
}

module.exports = new NotificationScheduler();
