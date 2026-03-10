const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const sequelize = require('../config/database');

const PasswordReset = sequelize.define('PasswordReset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  token: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'password_resets',
  timestamps: true,
  indexes: [
    { fields: ['token'], unique: true },
    { fields: ['userId'] },
    { fields: ['expiresAt'] },
  ],
});

/**
 * Create a reset token valid for 1 hour.
 */
PasswordReset.createForUser = async function (userId) {
  // Invalidate any existing tokens for this user
  await this.update(
    { usedAt: new Date() },
    { where: { userId, usedAt: null } }
  );

  const token = crypto.randomBytes(32).toString('hex');
  return this.create({
    userId,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });
};

/**
 * Find a valid (unused, unexpired) reset token.
 */
PasswordReset.findValid = function (token) {
  return this.findOne({
    where: {
      token,
      usedAt: null,
      expiresAt: { [require('sequelize').Op.gt]: new Date() },
    },
  });
};

module.exports = PasswordReset;
