'use strict';

/**
 * Migration: Create DB sequences for order/invoice numbers
 * and add propertyId column to core models for multi-tenancy.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create sequences for order/invoice number generation
    await queryInterface.sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1 INCREMENT BY 1;
    `);
    await queryInterface.sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1;
    `);

    // Add propertyId to core models for multi-tenancy
    const tables = ['Rooms', 'Guests', 'Reservations', 'Orders', 'Invoices', 'MenuCategories', 'MenuItems', 'RestaurantTables'];
    
    for (const table of tables) {
      try {
        // Check if table exists before trying to alter it
        const [results] = await queryInterface.sequelize.query(
          `SELECT to_regclass('public."${table}"') AS tbl;`
        );
        if (!results[0] || !results[0].tbl) {
          console.log(`  Skipping ${table} — table does not exist yet (will be created by sync).`);
          continue;
        }

        await queryInterface.addColumn(table, 'propertyId', {
          type: Sequelize.INTEGER,
          allowNull: true, // nullable initially to avoid breaking existing data
          references: { model: 'Properties', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
        await queryInterface.addIndex(table, ['propertyId'], {
          name: `idx_${table.toLowerCase()}_propertyid`,
        });
      } catch (err) {
        // Column may already exist or table doesn't exist yet
        if (!err.message.includes('already exists') && !err.message.includes('does not exist')) throw err;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS order_number_seq;');
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS invoice_number_seq;');

    const tables = ['Rooms', 'Guests', 'Reservations', 'Orders', 'Invoices', 'MenuCategories', 'MenuItems', 'RestaurantTables'];
    for (const table of tables) {
      try {
        await queryInterface.removeColumn(table, 'propertyId');
      } catch (err) {
        // Column may not exist
      }
    }
  },
};
