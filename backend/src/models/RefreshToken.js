const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const sequelize = require('../config/database');

const RefreshToken = sequelize.define('RefreshToken', {
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
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  revokedAt: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['token'] },
    { fields: ['userId'] },
    { fields: ['expiresAt'] },
  ],
});

/**
 * Generate a secure random refresh token
 */
RefreshToken.generateToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Create a refresh token for a user (7-day expiry)
 */
RefreshToken.createForUser = async (userId) => {
  const token = RefreshToken.generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const refreshToken = await RefreshToken.create({
    userId,
    token,
    expiresAt,
  });

  return refreshToken;
};

/**
 * Find a valid (not expired, not revoked) refresh token
 */
RefreshToken.findValid = async (token) => {
  return RefreshToken.findOne({
    where: {
      token,
      revokedAt: null,
      expiresAt: { [require('sequelize').Op.gt]: new Date() },
    },
  });
};

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
RefreshToken.revokeAllForUser = async (userId) => {
  return RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: null } }
  );
};

/**
 * Clean up expired tokens (call periodically)
 */
RefreshToken.cleanupExpired = async () => {
  return RefreshToken.destroy({
    where: {
      [require('sequelize').Op.or]: [
        { expiresAt: { [require('sequelize').Op.lt]: new Date() } },
        { revokedAt: { [require('sequelize').Op.ne]: null } },
      ],
    },
  });
};

module.exports = RefreshToken;
