const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HousekeepingTask = sequelize.define('HousekeepingTask', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  roomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'rooms', key: 'id' },
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'inspected'),
    defaultValue: 'pending',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
  },
  type: {
    type: DataTypes.ENUM('checkout_clean', 'daily_clean', 'deep_clean', 'maintenance', 'inspection'),
    defaultValue: 'daily_clean',
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  inspectedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  inspectedAt: { type: DataTypes.DATE, allowNull: true },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'properties', key: 'id' },
  },
}, {
  tableName: 'housekeeping_tasks',
  timestamps: true,
  indexes: [
    { fields: ['roomId'] },
    { fields: ['assignedTo'] },
    { fields: ['status'] },
    { fields: ['propertyId'] },
  ],
});

module.exports = HousekeepingTask;
