const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
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
  qrToken: {
    type: DataTypes.STRING(64),
    allowNull: true,
    unique: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  emailVerifyToken: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  emailVerifyExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
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
  hooks: {
    beforeCreate: async (guest) => {
      if (guest.passwordHash && !guest.passwordHash.startsWith('$2')) {
        guest.passwordHash = await bcrypt.hash(guest.passwordHash, 12);
      }
    },
    beforeUpdate: async (guest) => {
      if (guest.changed('passwordHash') && guest.passwordHash && !guest.passwordHash.startsWith('$2')) {
        guest.passwordHash = await bcrypt.hash(guest.passwordHash, 12);
      }
    },
  },
});

Guest.prototype.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = Guest;
