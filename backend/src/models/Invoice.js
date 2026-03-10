const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  invoiceNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
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
    comment: 'Array of {description, quantity, unitPrice, total}',
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
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'paid', 'overdue', 'void', 'refunded'),
    defaultValue: 'pending',
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'online', 'other'),
  },
  paidAt: {
    type: DataTypes.DATE,
  },
  dueDate: {
    type: DataTypes.DATEONLY,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'properties', key: 'id' },
  },
}, {
  tableName: 'invoices',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['guestId'] },
    { fields: ['reservationId'] },
    { fields: ['status'] },
    { fields: ['paidAt'] },
  ],
});

module.exports = Invoice;
