const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Email service — wraps nodemailer with app-aware defaults.
 * Supports SMTP (production) or Ethereal (development).
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'HotelSaaS <noreply@hotelsaas.com>';
  }

  /** Lazy-initialise the transporter (so env vars can be set late). */
  async getTransporter() {
    if (this.transporter) return this.transporter;

    if (process.env.SMTP_HOST) {
      // Real SMTP (SendGrid, Mailgun, SES, etc.)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Dev/test: use Ethereal (catch-all test mail server)
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      logger.info('Email: using Ethereal test account', { user: testAccount.user });
    }
    return this.transporter;
  }

  /**
   * Send an email and return the info object.
   * In dev mode, logs the Ethereal preview URL.
   */
  async send({ to, subject, text, html }) {
    const transporter = await this.getTransporter();
    const info = await transporter.sendMail({
      from: this.from,
      to,
      subject,
      text,
      html,
    });

    // Ethereal preview URL
    if (!process.env.SMTP_HOST) {
      logger.info('Email preview URL', { url: nodemailer.getTestMessageUrl(info) });
    }
    return info;
  }

  // ────────────────────────────────────────────
  // Domain-specific email templates
  // ────────────────────────────────────────────

  /** Password reset email */
  async sendPasswordReset({ to, resetUrl, firstName }) {
    return this.send({
      to,
      subject: 'HotelSaaS — Password Reset',
      text: `Hi ${firstName},\n\nYou requested a password reset. Click the link below within 1 hour:\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\nHotelSaaS Team`,
      html: `
        <h2>Password Reset</h2>
        <p>Hi ${firstName},</p>
        <p>You requested a password reset. Click the button below within <strong>1 hour</strong>:</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Reset Password</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <hr><p style="color:#666;font-size:12px;">HotelSaaS Team</p>
      `,
    });
  }

  /** Check-in reminder email */
  async sendCheckInReminder({ to, firstName, reservationId, checkInDate, roomNumber, hotelName }) {
    return this.send({
      to,
      subject: `Reminder: Your check-in at ${hotelName || 'HotelSaaS'} is tomorrow`,
      text: `Hi ${firstName},\n\nThis is a friendly reminder that your reservation #${reservationId} is scheduled for check-in on ${checkInDate}.\nRoom: ${roomNumber}\n\nWe look forward to welcoming you!\n\n${hotelName || 'HotelSaaS'} Team`,
      html: `
        <h2>Check-in Reminder</h2>
        <p>Hi ${firstName},</p>
        <p>Your reservation <strong>#${reservationId}</strong> is scheduled for check-in on <strong>${checkInDate}</strong>.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 12px;font-weight:bold;">Room</td><td style="padding:4px 12px">${roomNumber}</td></tr>
          <tr><td style="padding:4px 12px;font-weight:bold;">Check-in</td><td style="padding:4px 12px">${checkInDate}</td></tr>
        </table>
        <p>We look forward to welcoming you!</p>
        <hr><p style="color:#666;font-size:12px;">${hotelName || 'HotelSaaS'} Team</p>
      `,
    });
  }

  /** Invoice email */
  async sendInvoice({ to, firstName, invoiceNumber, totalAmount, dueDate, items }) {
    const itemRows = (items || []).map(i =>
      `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${i.description}</td><td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee">${i.quantity}</td><td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee">$${Number(i.unitPrice).toFixed(2)}</td><td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee">$${Number(i.total).toFixed(2)}</td></tr>`
    ).join('');

    return this.send({
      to,
      subject: `HotelSaaS — Invoice ${invoiceNumber}`,
      text: `Hi ${firstName},\n\nYour invoice ${invoiceNumber} for $${totalAmount} is attached.\nDue: ${dueDate || 'Upon receipt'}\n\nThank you for your stay!\n\nHotelSaaS Team`,
      html: `
        <h2>Invoice ${invoiceNumber}</h2>
        <p>Hi ${firstName},</p>
        <p>Here is your invoice summary:</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <thead><tr style="background:#f3f4f6"><th style="padding:8px;text-align:left">Description</th><th style="padding:8px;text-align:right">Qty</th><th style="padding:8px;text-align:right">Unit Price</th><th style="padding:8px;text-align:right">Total</th></tr></thead>
          <tbody>${itemRows}</tbody>
          <tfoot><tr style="font-weight:bold"><td colspan="3" style="padding:8px;text-align:right">Total</td><td style="padding:8px;text-align:right">$${Number(totalAmount).toFixed(2)}</td></tr></tfoot>
        </table>
        ${dueDate ? `<p>Due by <strong>${dueDate}</strong></p>` : ''}
        <p>Thank you for your stay!</p>
        <hr><p style="color:#666;font-size:12px;">HotelSaaS Team</p>
      `,
    });
  }

  /** Order confirmation email */
  async sendOrderConfirmation({ to, firstName, orderNumber, items, total }) {
    const itemList = (items || []).map(i => `• ${i.name} x${i.quantity} — $${Number(i.price * i.quantity).toFixed(2)}`).join('\n');
    return this.send({
      to,
      subject: `HotelSaaS — Order ${orderNumber} Confirmed`,
      text: `Hi ${firstName},\n\nYour order ${orderNumber} has been confirmed.\n\n${itemList}\n\nTotal: $${Number(total).toFixed(2)}\n\nHotelSaaS Team`,
      html: `
        <h2>Order Confirmed — ${orderNumber}</h2>
        <p>Hi ${firstName},</p>
        <ul>${(items || []).map(i => `<li>${i.name} x${i.quantity} — $${Number(i.price * i.quantity).toFixed(2)}</li>`).join('')}</ul>
        <p><strong>Total: $${Number(total).toFixed(2)}</strong></p>
        <hr><p style="color:#666;font-size:12px;">HotelSaaS Team</p>
      `,
    });
  }

  /** Reservation confirmation email */
  async sendReservationConfirmation({ to, firstName, reservationId, checkIn, checkOut, roomNumber, roomType, totalAmount, hotelName }) {
    const hotel = hotelName || 'HotelSaaS';
    return this.send({
      to,
      subject: `${hotel} — Reservation #${reservationId} Confirmed`,
      text: `Hi ${firstName},\n\nYour reservation #${reservationId} has been confirmed.\n\nRoom: ${roomNumber} (${roomType})\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nTotal: $${Number(totalAmount).toFixed(2)}\n\nWe look forward to welcoming you!\n\n${hotel} Team`,
      html: `
        <h2>Reservation Confirmed — #${reservationId}</h2>
        <p>Hi ${firstName},</p>
        <p>Your reservation has been confirmed. Here are the details:</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 16px;font-weight:bold;background:#f3f4f6">Room</td><td style="padding:6px 16px">${roomNumber} (${roomType})</td></tr>
          <tr><td style="padding:6px 16px;font-weight:bold;background:#f3f4f6">Check-in</td><td style="padding:6px 16px">${checkIn}</td></tr>
          <tr><td style="padding:6px 16px;font-weight:bold;background:#f3f4f6">Check-out</td><td style="padding:6px 16px">${checkOut}</td></tr>
          <tr><td style="padding:6px 16px;font-weight:bold;background:#f3f4f6">Total</td><td style="padding:6px 16px"><strong>$${Number(totalAmount).toFixed(2)}</strong></td></tr>
        </table>
        <p>We look forward to welcoming you!</p>
        <hr><p style="color:#666;font-size:12px;">${hotel} Team</p>
      `,
    });
  }

  /** Checkout summary email */
  async sendCheckoutSummary({ to, firstName, reservationId, checkIn, checkOut, roomNumber, totalAmount, paidAmount, hotelName }) {
    const hotel = hotelName || 'HotelSaaS';
    const balance = Number(totalAmount) - Number(paidAmount || 0);
    return this.send({
      to,
      subject: `${hotel} — Checkout Summary for Reservation #${reservationId}`,
      text: `Hi ${firstName},\n\nThank you for staying with us! Here is your checkout summary:\n\nReservation: #${reservationId}\nRoom: ${roomNumber}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nTotal: $${Number(totalAmount).toFixed(2)}\nPaid: $${Number(paidAmount || 0).toFixed(2)}\n${balance > 0 ? `Balance Due: $${balance.toFixed(2)}` : 'Fully Paid ✓'}\n\nWe hope you enjoyed your stay!\n\n${hotel} Team`,
      html: `
        <h2>Checkout Summary — #${reservationId}</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for staying with us! Here is your checkout summary:</p>
        <table style="border-collapse:collapse;margin:16px 0;width:100%;max-width:400px">
          <tr><td style="padding:6px 16px;font-weight:bold;background:#f3f4f6">Room</td><td style="padding:6px 16px">${roomNumber}</td></tr>
          <tr><td style="padding:6px 16px;font-weight:bold;background:#f3f4f6">Check-in</td><td style="padding:6px 16px">${checkIn}</td></tr>
          <tr><td style="padding:6px 16px;font-weight:bold;background:#f3f4f6">Check-out</td><td style="padding:6px 16px">${checkOut}</td></tr>
          <tr><td style="padding:6px 16px;font-weight:bold;background:#f3f4f6">Total</td><td style="padding:6px 16px">$${Number(totalAmount).toFixed(2)}</td></tr>
          <tr><td style="padding:6px 16px;font-weight:bold;background:#f3f4f6">Paid</td><td style="padding:6px 16px">$${Number(paidAmount || 0).toFixed(2)}</td></tr>
          ${balance > 0 ? `<tr><td style="padding:6px 16px;font-weight:bold;background:#fef2f2;color:#dc2626">Balance Due</td><td style="padding:6px 16px;color:#dc2626"><strong>$${balance.toFixed(2)}</strong></td></tr>` : `<tr><td colspan="2" style="padding:6px 16px;background:#f0fdf4;color:#16a34a;text-align:center"><strong>✓ Fully Paid</strong></td></tr>`}
        </table>
        <p>We hope you enjoyed your stay. See you again soon!</p>
        <hr><p style="color:#666;font-size:12px;">${hotel} Team</p>
      `,
    });
  }
}

// Singleton
module.exports = new EmailService();
