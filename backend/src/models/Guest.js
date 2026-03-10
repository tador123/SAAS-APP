const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Guest = sequelize.define('Guest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
    validate: { isEmail: true },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  idType: {
    type: DataTypes.ENUM('passport', 'national_id', 'drivers_license', 'other'),
  },
  idNumber: {
    type: DataTypes.STRING(50),
  },
  nationality: {
    type: DataTypes.STRING(50),
  },
  address: {
    type: DataTypes.TEXT,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
  },
  vipStatus: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
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
  tableName: 'guests',
  timestamps: true,
  paranoid: true,
});

module.exports = Guest;
