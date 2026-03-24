const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TableReservation = sequelize.define('TableReservation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tableId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'restaurant_tables', key: 'id' },
  },
  guestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'guests', key: 'id' },
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'properties', key: 'id' },
  },
  reservationDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  reservationTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  partySize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'),
    defaultValue: 'pending',
  },
  specialRequests: {
    type: DataTypes.TEXT,
  },
  preOrderItems: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of {menuItemId, name, quantity, price, notes}',
  },
  preOrderTotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  qrToken: {
    type: DataTypes.STRING(64),
    allowNull: true,
    unique: true,
  },
}, {
  tableName: 'table_reservations',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['tableId'] },
    { fields: ['guestId'] },
    { fields: ['propertyId'] },
    { fields: ['reservationDate'] },
    { fields: ['status'] },
  ],
});

module.exports = TableReservation;
