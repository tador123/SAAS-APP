const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  roomNumber: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
  },
  type: {
    type: DataTypes.ENUM('single', 'double', 'twin', 'suite', 'deluxe', 'penthouse'),
    allowNull: false,
  },
  floor: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'reserved', 'maintenance', 'cleaning'),
    defaultValue: 'available',
  },
  amenities: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  description: {
    type: DataTypes.TEXT,
  },
  maxOccupancy: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'properties', key: 'id' },
  },
}, {
  tableName: 'rooms',
  timestamps: true,
  paranoid: true,
});

module.exports = Room;
