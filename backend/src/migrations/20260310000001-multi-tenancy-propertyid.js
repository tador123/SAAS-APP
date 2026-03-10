'use strict';

/**
 * Migration: Multi-tenancy Phase 1
 *
 * 1. Add subscriptionPlan + stripeCustomerId to properties (plan lives on property, not user)
 * 2. Add propertyId FK to all data tables (lowercase table names)
 * 3. Assign existing data to a default property
 * 4. Remove subscriptionPlan + stripeCustomerId from users (moved to properties)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ── 1. Add subscriptionPlan + stripeCustomerId to properties ───────────
      await queryInterface.addColumn('properties', 'subscriptionPlan', {
        type: Sequelize.ENUM('free', 'basic', 'premium', 'enterprise'),
        defaultValue: 'free',
        allowNull: false,
      }, { transaction });

      await queryInterface.addColumn('properties', 'stripeCustomerId', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      // ── 2. Add propertyId to all data tables ──────────────────────────────
      const tables = [
        'rooms', 'guests', 'reservations', 'orders',
        'invoices', 'menu_categories', 'menu_items', 'restaurant_tables',
      ];

      for (const table of tables) {
        await queryInterface.addColumn(table, 'propertyId', {
          type: Sequelize.INTEGER,
          allowNull: true, // nullable initially so existing rows aren't broken
          references: { model: 'properties', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        }, { transaction });

        await queryInterface.addIndex(table, ['propertyId'], {
          name: `idx_${table}_propertyid`,
          transaction,
        });
      }

      // ── 3. Create a default property for existing data ────────────────────
      // Check if any property exists
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM properties LIMIT 1`,
        { transaction }
      );

      let defaultPropertyId;
      if (existing.length > 0) {
        defaultPropertyId = existing[0].id;
      } else {
        // Create default property
        const [inserted] = await queryInterface.sequelize.query(
          `INSERT INTO properties (name, slug, "subscriptionPlan", "isActive", "createdAt", "updatedAt")
           VALUES ('Default Hotel', 'default-hotel', 'enterprise', true, NOW(), NOW())
           RETURNING id`,
          { transaction }
        );
        defaultPropertyId = inserted[0].id;
      }

      // ── 4. Assign all existing data to the default property ───────────────
      for (const table of tables) {
        await queryInterface.sequelize.query(
          `UPDATE "${table}" SET "propertyId" = ${defaultPropertyId} WHERE "propertyId" IS NULL`,
          { transaction }
        );
      }

      // Assign unassigned users to the default property
      await queryInterface.sequelize.query(
        `UPDATE users SET "propertyId" = ${defaultPropertyId} WHERE "propertyId" IS NULL`,
        { transaction }
      );

      // Copy the admin user's subscriptionPlan to the default property
      const [adminUser] = await queryInterface.sequelize.query(
        `SELECT "subscriptionPlan" FROM users WHERE role = 'admin' LIMIT 1`,
        { transaction }
      );
      if (adminUser.length > 0 && adminUser[0].subscriptionPlan) {
        await queryInterface.sequelize.query(
          `UPDATE properties SET "subscriptionPlan" = '${adminUser[0].subscriptionPlan}' WHERE id = ${defaultPropertyId}`,
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = [
        'rooms', 'guests', 'reservations', 'orders',
        'invoices', 'menu_categories', 'menu_items', 'restaurant_tables',
      ];

      for (const table of tables) {
        try {
          await queryInterface.removeIndex(table, `idx_${table}_propertyid`, { transaction });
        } catch (e) { /* index may not exist */ }
        await queryInterface.removeColumn(table, 'propertyId', { transaction });
      }

      await queryInterface.removeColumn('properties', 'stripeCustomerId', { transaction });
      await queryInterface.removeColumn('properties', 'subscriptionPlan', { transaction });
      // Drop the enum type created by Sequelize
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_properties_subscriptionPlan"',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
