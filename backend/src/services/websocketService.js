const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * WebSocket service — provides real-time events for:
 *  - Kitchen display (new orders, order status changes)
 *  - Order tracking (guests / waiters)
 *  - Reservation updates (front-desk)
 *  - Dashboard live updates
 *
 * Rooms (channels):
 *  - `kitchen`       — chefs see new orders & status changes
 *  - `orders`        — all order events
 *  - `reservations`  — reservation create/update/status
 *  - `dashboard`     — live dashboard stats
 *  - `notifications` — system-wide notifications
 */
class WebSocketService {
  constructor() {
    this.io = null;
  }

  /**
   * Attach Socket.io to the HTTP server.
   * @param {import('http').Server} httpServer
   * @param {object} opts — cors config etc.
   */
  init(httpServer, opts = {}) {
    this.io = new Server(httpServer, {
      cors: {
        origin: opts.corsOrigins || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/ws',
      transports: ['websocket', 'polling'],
    });

    // ── JWT authentication middleware for WebSocket connections ──
    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
      } catch (err) {
        return next(new Error('Invalid or expired token'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.debug('WS connected', { socketId: socket.id, userId: socket.userId });

      // Clients join rooms based on their role (sent from client)
      socket.on('join', (rooms) => {
        if (Array.isArray(rooms)) {
          rooms.forEach(room => socket.join(room));
        } else if (typeof rooms === 'string') {
          socket.join(rooms);
        }
      });

      socket.on('leave', (room) => {
        socket.leave(room);
      });

      socket.on('disconnect', () => {
        logger.debug('WS disconnected', { socketId: socket.id });
      });
    });

    logger.info('WebSocket service initialised (path: /ws)');
    return this.io;
  }

  // ─────────────────────────────────────────────
  // Event emitters — call these from route handlers
  // ─────────────────────────────────────────────

  /** New order placed */
  emitNewOrder(order) {
    if (!this.io) return;
    this.io.to('kitchen').to('orders').to('dashboard').emit('order:new', order);
  }

  /** Order status changed */
  emitOrderStatusChange(order) {
    if (!this.io) return;
    this.io.to('kitchen').to('orders').to('dashboard').emit('order:status', {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      updatedAt: order.updatedAt,
    });
  }

  /** Order updated (items/totals changed) */
  emitOrderUpdated(order) {
    if (!this.io) return;
    this.io.to('kitchen').to('orders').emit('order:updated', order);
  }

  /** New reservation created */
  emitNewReservation(reservation) {
    if (!this.io) return;
    this.io.to('reservations').to('dashboard').emit('reservation:new', reservation);
  }

  /** Reservation status changed */
  emitReservationStatusChange(reservation) {
    if (!this.io) return;
    this.io.to('reservations').to('dashboard').emit('reservation:status', {
      id: reservation.id,
      status: reservation.status,
      updatedAt: reservation.updatedAt,
    });
  }

  /** Invoice created or paid */
  emitInvoiceEvent(type, invoice) {
    if (!this.io) return;
    this.io.to('dashboard').emit(`invoice:${type}`, {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      status: invoice.status,
    });
  }

  /** Generic notification */
  emitNotification(message) {
    if (!this.io) return;
    this.io.to('notifications').emit('notification', message);
  }

  /** Dashboard stats updated */
  emitDashboardRefresh() {
    if (!this.io) return;
    this.io.to('dashboard').emit('dashboard:refresh');
  }

  /** Housekeeping task updated */
  emitHousekeepingUpdate(task) {
    if (!this.io) return;
    this.io.to('housekeeping').to('dashboard').emit('housekeeping:update', task);
  }

  /** Kitchen display refresh */
  emitKitchenRefresh() {
    if (!this.io) return;
    this.io.to('kitchen').emit('kitchen:refresh');
  }
}

// Singleton
module.exports = new WebSocketService();
