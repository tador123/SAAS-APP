const sequelize = require('../config/database');
const User = require('./User');
const Room = require('./Room');
const Guest = require('./Guest');
const Reservation = require('./Reservation');
const MenuCategory = require('./MenuCategory');
const MenuItem = require('./MenuItem');
const RestaurantTable = require('./RestaurantTable');
const Order = require('./Order');
const Invoice = require('./Invoice');
const RefreshToken = require('./RefreshToken');
const AuditLog = require('./AuditLog');
const PasswordReset = require('./PasswordReset');
const Property = require('./Property');
const HousekeepingTask = require('./HousekeepingTask');
const GuestRefreshToken = require('./GuestRefreshToken');
const TableReservation = require('./TableReservation');

// === Associations ===

// Guest <-> Reservation
Guest.hasMany(Reservation, { foreignKey: 'guestId', as: 'reservations' });
Reservation.belongsTo(Guest, { foreignKey: 'guestId', as: 'guest' });

// Room <-> Reservation
Room.hasMany(Reservation, { foreignKey: 'roomId', as: 'reservations' });
Reservation.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

// MenuCategory <-> MenuItem
MenuCategory.hasMany(MenuItem, { foreignKey: 'categoryId', as: 'items' });
MenuItem.belongsTo(MenuCategory, { foreignKey: 'categoryId', as: 'category' });

// RestaurantTable <-> Order
RestaurantTable.hasMany(Order, { foreignKey: 'tableId', as: 'orders' });
Order.belongsTo(RestaurantTable, { foreignKey: 'tableId', as: 'table' });

// Guest <-> Order
Guest.hasMany(Order, { foreignKey: 'guestId', as: 'orders' });
Order.belongsTo(Guest, { foreignKey: 'guestId', as: 'guest' });

// Reservation <-> Order
Reservation.hasMany(Order, { foreignKey: 'reservationId', as: 'orders' });
Order.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

// User (waiter) <-> Order
User.hasMany(Order, { foreignKey: 'servedBy', as: 'servedOrders' });
Order.belongsTo(User, { foreignKey: 'servedBy', as: 'waiter' });

// Guest <-> Invoice
Guest.hasMany(Invoice, { foreignKey: 'guestId', as: 'invoices' });
Invoice.belongsTo(Guest, { foreignKey: 'guestId', as: 'guest' });

// Reservation <-> Invoice
Reservation.hasMany(Invoice, { foreignKey: 'reservationId', as: 'invoices' });
Invoice.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

// User <-> RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> AuditLog
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> PasswordReset
User.hasMany(PasswordReset, { foreignKey: 'userId', as: 'passwordResets' });
PasswordReset.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Property <-> User (multi-tenancy)
Property.hasMany(User, { foreignKey: 'propertyId', as: 'users' });
User.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// Property <-> data models (multi-tenancy scoping)
Property.hasMany(Room, { foreignKey: 'propertyId', as: 'rooms' });
Room.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Property.hasMany(Guest, { foreignKey: 'propertyId', as: 'guests' });
Guest.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Property.hasMany(Reservation, { foreignKey: 'propertyId', as: 'reservations' });
Reservation.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Property.hasMany(Order, { foreignKey: 'propertyId', as: 'orders' });
Order.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Property.hasMany(Invoice, { foreignKey: 'propertyId', as: 'invoices' });
Invoice.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Property.hasMany(MenuCategory, { foreignKey: 'propertyId', as: 'menuCategories' });
MenuCategory.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Property.hasMany(MenuItem, { foreignKey: 'propertyId', as: 'menuItems' });
MenuItem.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Property.hasMany(RestaurantTable, { foreignKey: 'propertyId', as: 'restaurantTables' });
RestaurantTable.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// HousekeepingTask associations
Room.hasMany(HousekeepingTask, { foreignKey: 'roomId', as: 'housekeepingTasks' });
HousekeepingTask.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

User.hasMany(HousekeepingTask, { foreignKey: 'assignedTo', as: 'assignedTasks' });
HousekeepingTask.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

User.hasMany(HousekeepingTask, { foreignKey: 'inspectedBy', as: 'inspectedTasks' });
HousekeepingTask.belongsTo(User, { foreignKey: 'inspectedBy', as: 'inspector' });

Property.hasMany(HousekeepingTask, { foreignKey: 'propertyId', as: 'housekeepingTasks' });
HousekeepingTask.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// Guest <-> GuestRefreshToken
Guest.hasMany(GuestRefreshToken, { foreignKey: 'guestId', as: 'refreshTokens' });
GuestRefreshToken.belongsTo(Guest, { foreignKey: 'guestId', as: 'guest' });

// TableReservation associations
RestaurantTable.hasMany(TableReservation, { foreignKey: 'tableId', as: 'tableReservations' });
TableReservation.belongsTo(RestaurantTable, { foreignKey: 'tableId', as: 'table' });

Guest.hasMany(TableReservation, { foreignKey: 'guestId', as: 'tableReservations' });
TableReservation.belongsTo(Guest, { foreignKey: 'guestId', as: 'guest' });

Property.hasMany(TableReservation, { foreignKey: 'propertyId', as: 'tableReservations' });
TableReservation.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

module.exports = {
  sequelize,
  User,
  Room,
  Guest,
  Reservation,
  MenuCategory,
  MenuItem,
  RestaurantTable,
  Order,
  Invoice,
  RefreshToken,
  AuditLog,
  PasswordReset,
  Property,
  HousekeepingTask,
  GuestRefreshToken,
  TableReservation,
};
