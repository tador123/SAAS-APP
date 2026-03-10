const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reservation = sequelize.define('Reservation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  guestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'guests', key: 'id' },
  },
  roomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'rooms', key: 'id' },
  },
  checkIn: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  checkOut: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'),
    defaultValue: 'pending',
  },
  adults: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  children: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  specialRequests: {
    type: DataTypes.TEXT,
  },
  source: {
    type: DataTypes.ENUM('walk_in', 'phone', 'website', 'booking_com', 'airbnb', 'other'),
    defaultValue: 'walk_in',
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'properties', key: 'id' },
  },
}, {
  tableName: 'reservations',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['guestId'] },
    { fields: ['roomId'] },
    { fields: ['status'] },
    { fields: ['checkIn'] },
    { fields: ['checkOut'] },
    { fields: ['roomId', 'checkIn', 'checkOut'] },
  ],
});

module.exports = Reservation;
