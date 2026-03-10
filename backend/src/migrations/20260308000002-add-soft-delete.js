'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = [
      'users', 'rooms', 'guests', 'reservations',
      'menu_categories', 'menu_items', 'restaurant_tables',
      'orders', 'invoices',
    ];

    for (const table of tables) {
      await queryInterface.addColumn(table, 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
      await queryInterface.addIndex(table, ['deletedAt'], {
        name: `${table}_deleted_at_idx`,
      });
    }
  },

  async down(queryInterface) {
    const tables = [
      'users', 'rooms', 'guests', 'reservations',
      'menu_categories', 'menu_items', 'restaurant_tables',
      'orders', 'invoices',
    ];

    for (const table of tables) {
      await queryInterface.removeIndex(table, `${table}_deleted_at_idx`);
      await queryInterface.removeColumn(table, 'deletedAt');
    }
  },
};
