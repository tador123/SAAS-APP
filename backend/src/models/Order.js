const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  tableId: {
    type: DataTypes.INTEGER,
    references: { model: 'restaurant_tables', key: 'id' },
  },
  guestId: {
    type: DataTypes.INTEGER,
    references: { model: 'guests', key: 'id' },
  },
  reservationId: {
    type: DataTypes.INTEGER,
    references: { model: 'reservations', key: 'id' },
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of {menuItemId, name, quantity, price, notes}',
  },
  orderType: {
    type: DataTypes.ENUM('dine_in', 'room_service', 'takeaway'),
    defaultValue: 'dine_in',
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'),
    defaultValue: 'pending',
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  servedBy: {
    type: DataTypes.INTEGER,
    references: { model: 'users', key: 'id' },
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'properties', key: 'id' },
  },
}, {
  tableName: 'orders',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['tableId'] },
    { fields: ['guestId'] },
    { fields: ['status'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Order;
