const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('system_admin', 'admin', 'manager', 'receptionist', 'waiter', 'chef', 'staff'),
    defaultValue: 'staff',
  },
  phone: {
    type: DataTypes.STRING(20),
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
    comment: 'Stripe customer ID for billing',
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'properties', key: 'id' },
    comment: 'Multi-tenancy: the property this user belongs to',
  },
  lastLogin: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
