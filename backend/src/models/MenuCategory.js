const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MenuCategory = sequelize.define('MenuCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'properties', key: 'id' },
  },
}, {
  tableName: 'menu_categories',
  timestamps: true,
  paranoid: true,
  indexes: [
    { unique: true, fields: ['propertyId', 'name'], where: { deletedAt: null } },
  ],
});

module.exports = MenuCategory;
