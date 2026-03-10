const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'menu_categories', key: 'id' },
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING,
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  preparationTime: {
    type: DataTypes.INTEGER,
    comment: 'Preparation time in minutes',
  },
  allergens: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  isVegetarian: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isVegan: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'properties', key: 'id' },
  },
}, {
  tableName: 'menu_items',
  timestamps: true,
  paranoid: true,
});

module.exports = MenuItem;
