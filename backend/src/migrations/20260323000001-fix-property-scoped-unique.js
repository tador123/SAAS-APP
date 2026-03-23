'use strict';

/**
 * Fix unique constraints to be property-scoped instead of global.
 * In multi-tenant SaaS, Room "101", category "Appetizers", Table "1" etc.
 * should be unique per property, not globally across all hotels.
 *
 * NOTE: The MigrationRunner provides its own transaction via the 3rd argument.
 * These are UNIQUE CONSTRAINTS (not standalone indexes), so we must use
 * ALTER TABLE ... DROP CONSTRAINT instead of DROP INDEX.
 */
module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    // ── rooms.roomNumber: drop global unique constraint, add composite unique index ──
    await queryInterface.sequelize.query(
      'ALTER TABLE rooms DROP CONSTRAINT IF EXISTS "rooms_roomNumber_key"',
      { transaction }
    );
    await queryInterface.addIndex('rooms', ['propertyId', 'roomNumber'], {
      unique: true,
      name: 'rooms_property_room_number_unique',
      where: { deletedAt: null },
      transaction,
    });

    // ── menu_categories.name: drop global unique constraint, add composite unique index ──
    await queryInterface.sequelize.query(
      'ALTER TABLE menu_categories DROP CONSTRAINT IF EXISTS "menu_categories_name_key"',
      { transaction }
    );
    await queryInterface.addIndex('menu_categories', ['propertyId', 'name'], {
      unique: true,
      name: 'menu_categories_property_name_unique',
      where: { deletedAt: null },
      transaction,
    });

    // ── restaurant_tables.tableNumber: drop global unique constraint, add composite unique index ──
    await queryInterface.sequelize.query(
      'ALTER TABLE restaurant_tables DROP CONSTRAINT IF EXISTS "restaurant_tables_tableNumber_key"',
      { transaction }
    );
    await queryInterface.addIndex('restaurant_tables', ['propertyId', 'tableNumber'], {
      unique: true,
      name: 'restaurant_tables_property_table_number_unique',
      where: { deletedAt: null },
      transaction,
    });
  },

  async down(queryInterface, Sequelize, transaction) {
    // Drop composite indexes
    await queryInterface.removeIndex('rooms', 'rooms_property_room_number_unique', { transaction });
    await queryInterface.removeIndex('menu_categories', 'menu_categories_property_name_unique', { transaction });
    await queryInterface.removeIndex('restaurant_tables', 'restaurant_tables_property_table_number_unique', { transaction });

    // Restore global unique constraints
    await queryInterface.addConstraint('rooms', { fields: ['roomNumber'], type: 'unique', name: 'rooms_roomNumber_key', transaction });
    await queryInterface.addConstraint('menu_categories', { fields: ['name'], type: 'unique', name: 'menu_categories_name_key', transaction });
    await queryInterface.addConstraint('restaurant_tables', { fields: ['tableNumber'], type: 'unique', name: 'restaurant_tables_tableNumber_key', transaction });
  },
};
