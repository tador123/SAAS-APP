'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add 'system_admin' to users role enum
    // PostgreSQL requires recreating the enum type or adding a value
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'system_admin' BEFORE 'admin';
    `);

    // 2. Add approvalStatus to properties table
    await queryInterface.addColumn('properties', 'approvalStatus', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'approved', // existing properties are approved
      allowNull: false,
    });

    // 3. Add rejectionReason to properties table
    await queryInterface.addColumn('properties', 'rejectionReason', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // 4. Add approvedAt and approvedBy to properties table  
    await queryInterface.addColumn('properties', 'approvedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('properties', 'approvedBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('properties', 'approvedBy');
    await queryInterface.removeColumn('properties', 'approvedAt');
    await queryInterface.removeColumn('properties', 'rejectionReason');
    await queryInterface.removeColumn('properties', 'approvalStatus');
    // Note: PostgreSQL doesn't support removing enum values easily
  },
};
