const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    references: { model: 'users', key: 'id' },
  },
  action: {
    type: DataTypes.ENUM('create', 'update', 'delete', 'login', 'logout', 'status_change'),
    allowNull: false,
  },
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  entityId: {
    type: DataTypes.INTEGER,
  },
  changes: {
    type: DataTypes.JSON,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
  },
  userAgent: {
    type: DataTypes.STRING(500),
  },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['entityType', 'entityId'] },
    { fields: ['createdAt'] },
    { fields: ['action'] },
  ],
});

/**
 * Log an audit event
 * @param {Object} options
 * @param {number} options.userId - The user who performed the action
 * @param {string} options.action - create | update | delete | login | logout | status_change
 * @param {string} options.entityType - The entity type (e.g., 'Room', 'Order', 'Invoice')
 * @param {number} [options.entityId] - The entity ID
 * @param {Object} [options.changes] - What changed (before/after)
 * @param {Object} [options.req] - Express request object (for IP and user agent)
 */
AuditLog.log = async ({ userId, action, entityType, entityId, changes, req }) => {
  try {
    return await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      changes,
      ipAddress: req ? (req.ip || req.connection?.remoteAddress) : null,
      userAgent: req ? req.get('user-agent')?.substring(0, 500) : null,
    });
  } catch (error) {
    // Audit logging should never break the main flow
    require('../services/logger').error('Audit log error', { error: error.message });
  }
};

module.exports = AuditLog;
