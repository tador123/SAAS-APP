const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GuestRefreshToken = sequelize.define('GuestRefreshToken', {
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
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'guest_refresh_tokens',
  timestamps: true,
});

module.exports = GuestRefreshToken;
