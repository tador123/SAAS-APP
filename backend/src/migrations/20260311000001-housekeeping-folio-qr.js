'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Housekeeping Tasks table ──
    await queryInterface.createTable('housekeeping_tasks', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      roomId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'rooms', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assignedTo: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'inspected'),
        defaultValue: 'pending',
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
      },
      type: {
        type: Sequelize.ENUM('checkout_clean', 'daily_clean', 'deep_clean', 'maintenance', 'inspection'),
        defaultValue: 'daily_clean',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      completedAt: { type: Sequelize.DATE, allowNull: true },
      inspectedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      inspectedAt: { type: Sequelize.DATE, allowNull: true },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('housekeeping_tasks', ['roomId']);
    await queryInterface.addIndex('housekeeping_tasks', ['assignedTo']);
    await queryInterface.addIndex('housekeeping_tasks', ['status']);
    await queryInterface.addIndex('housekeeping_tasks', ['propertyId']);

    // ── Folio number sequence ──
    await queryInterface.sequelize.query(
      `CREATE SEQUENCE IF NOT EXISTS folio_number_seq START WITH 1 INCREMENT BY 1;`
    );

    // ── Add images column to rooms if not present ──
    const roomCols = await queryInterface.describeTable('rooms');
    if (!roomCols.images) {
      await queryInterface.addColumn('rooms', 'images', {
        type: Sequelize.JSON,
        defaultValue: [],
      });
    }

    // ── Add images column to menu_items if not present ──
    const menuCols = await queryInterface.describeTable('menu_items');
    if (!menuCols.image) {
      await queryInterface.addColumn('menu_items', 'image', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }

    // ── QR token column on restaurant_tables for public ordering ──
    const tableCols = await queryInterface.describeTable('restaurant_tables');
    if (!tableCols.qrToken) {
      await queryInterface.addColumn('restaurant_tables', 'qrToken', {
        type: Sequelize.STRING(64),
        allowNull: true,
        unique: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('housekeeping_tasks');
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS folio_number_seq;');
    await queryInterface.removeColumn('rooms', 'images').catch(() => {});
    await queryInterface.removeColumn('menu_items', 'image').catch(() => {});
    await queryInterface.removeColumn('restaurant_tables', 'qrToken').catch(() => {});
  },
};
