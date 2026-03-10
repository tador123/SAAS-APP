'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create properties table
    await queryInterface.createTable('properties', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      slug: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      address: { type: Sequelize.TEXT },
      phone: { type: Sequelize.STRING(20) },
      email: { type: Sequelize.STRING(100) },
      timezone: { type: Sequelize.STRING(50), defaultValue: 'UTC' },
      currency: { type: Sequelize.STRING(3), defaultValue: 'USD' },
      settings: { type: Sequelize.JSON, defaultValue: {} },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE },
    });

    // Create password_resets table
    await queryInterface.createTable('password_resets', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      token: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      usedAt: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('password_resets', ['token'], { unique: true });
    await queryInterface.addIndex('password_resets', ['userId']);
    await queryInterface.addIndex('password_resets', ['expiresAt']);

    // Add propertyId to users
    await queryInterface.addColumn('users', 'propertyId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'properties', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('users', ['propertyId']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'propertyId');
    await queryInterface.dropTable('password_resets');
    await queryInterface.dropTable('properties');
  },
};
