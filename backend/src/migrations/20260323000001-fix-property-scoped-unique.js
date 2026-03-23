'use strict';

/**
 * Fix unique constraints to be property-scoped instead of global.
 * In multi-tenant SaaS, Room "101", category "Appetizers", Table "1" etc.
 * should be unique per property, not globally across all hotels.
 */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // ── rooms.roomNumber: drop global unique, add composite unique ──
      // Find and drop the existing unique index on roomNumber
      const roomIndexes = await queryInterface.showIndex('rooms', { transaction });
      for (const idx of roomIndexes) {
        if (idx.unique && idx.name !== 'PRIMARY' && idx.name !== 'rooms_pkey') {
          const cols = Array.isArray(idx.fields)
            ? idx.fields.map(f => (typeof f === 'object' ? f.attribute || f.name : f))
            : [];
          if (cols.includes('roomNumber') || cols.includes('room_number')) {
            if (!cols.includes('propertyId') && !cols.includes('property_id')) {
              await queryInterface.removeIndex('rooms', idx.name, { transaction });
            }
          }
        }
      }
      await queryInterface.addIndex('rooms', ['propertyId', 'roomNumber'], {
        unique: true,
        name: 'rooms_property_room_number_unique',
        where: { deletedAt: null },
        transaction,
      });

      // ── menu_categories.name: drop global unique, add composite unique ──
      const catIndexes = await queryInterface.showIndex('menu_categories', { transaction });
      for (const idx of catIndexes) {
        if (idx.unique && idx.name !== 'PRIMARY' && idx.name !== 'menu_categories_pkey') {
          const cols = Array.isArray(idx.fields)
            ? idx.fields.map(f => (typeof f === 'object' ? f.attribute || f.name : f))
            : [];
          if (cols.includes('name')) {
            if (!cols.includes('propertyId') && !cols.includes('property_id')) {
              await queryInterface.removeIndex('menu_categories', idx.name, { transaction });
            }
          }
        }
      }
      await queryInterface.addIndex('menu_categories', ['propertyId', 'name'], {
        unique: true,
        name: 'menu_categories_property_name_unique',
        where: { deletedAt: null },
        transaction,
      });

      // ── restaurant_tables.tableNumber: drop global unique, add composite unique ──
      const tableIndexes = await queryInterface.showIndex('restaurant_tables', { transaction });
      for (const idx of tableIndexes) {
        if (idx.unique && idx.name !== 'PRIMARY' && idx.name !== 'restaurant_tables_pkey') {
          const cols = Array.isArray(idx.fields)
            ? idx.fields.map(f => (typeof f === 'object' ? f.attribute || f.name : f))
            : [];
          if (cols.includes('tableNumber') || cols.includes('table_number')) {
            if (!cols.includes('propertyId') && !cols.includes('property_id')) {
              await queryInterface.removeIndex('restaurant_tables', idx.name, { transaction });
            }
          }
        }
      }
      await queryInterface.addIndex('restaurant_tables', ['propertyId', 'tableNumber'], {
        unique: true,
        name: 'restaurant_tables_property_table_number_unique',
        where: { deletedAt: null },
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Revert to global unique constraints
      await queryInterface.removeIndex('rooms', 'rooms_property_room_number_unique', { transaction });
      await queryInterface.addIndex('rooms', ['roomNumber'], { unique: true, transaction });

      await queryInterface.removeIndex('menu_categories', 'menu_categories_property_name_unique', { transaction });
      await queryInterface.addIndex('menu_categories', ['name'], { unique: true, transaction });

      await queryInterface.removeIndex('restaurant_tables', 'restaurant_tables_property_table_number_unique', { transaction });
      await queryInterface.addIndex('restaurant_tables', ['tableNumber'], { unique: true, transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
