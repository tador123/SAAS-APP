const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RestaurantTable = sequelize.define('RestaurantTable', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tableNumber: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4,
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'reserved', 'maintenance'),
    defaultValue: 'available',
  },
  location: {
    type: DataTypes.ENUM('indoor', 'outdoor', 'terrace', 'private'),
    defaultValue: 'indoor',
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'properties', key: 'id' },
  },
}, {
  tableName: 'restaurant_tables',
  timestamps: true,
  paranoid: true,
});

module.exports = RestaurantTable;
