const router = require('express').Router();

const authRoutes = require('./auth');
const roomRoutes = require('./rooms');
const reservationRoutes = require('./reservations');
const guestRoutes = require('./guests');
const restaurantRoutes = require('./restaurant');
const orderRoutes = require('./orders');
const invoiceRoutes = require('./invoices');
const dashboardRoutes = require('./dashboard');
const auditLogRoutes = require('./auditLogs');
const uploadRoutes = require('./uploads');
const notificationRoutes = require('./notifications');
const propertyRoutes = require('./properties');
const userRoutes = require('./users');

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/reservations', reservationRoutes);
router.use('/guests', guestRoutes);
router.use('/restaurant', restaurantRoutes);
router.use('/orders', orderRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/uploads', uploadRoutes);
router.use('/notifications', notificationRoutes);
router.use('/properties', propertyRoutes);
router.use('/users', userRoutes);

module.exports = router;
