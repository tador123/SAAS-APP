const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  address: {
    type: DataTypes.TEXT,
  },
  phone: {
    type: DataTypes.STRING(20),
  },
  email: {
    type: DataTypes.STRING(100),
    validate: { isEmail: true },
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC',
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
  },
  country: {
    type: DataTypes.STRING(2),
    allowNull: true,
    comment: 'ISO 3166-1 alpha-2 country code',
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Property-specific configuration (tax rate, check-in time, etc.)',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  subscriptionPlan: {
    type: DataTypes.ENUM('free', 'basic', 'premium', 'enterprise'),
    defaultValue: 'free',
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe customer ID for property billing',
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'approved',
    allowNull: false,
    comment: 'Account approval status — new signups start as pending',
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID of the system admin who approved this property',
  },
}, {
  tableName: 'properties',
  timestamps: true,
  paranoid: true,
});

module.exports = Property;
