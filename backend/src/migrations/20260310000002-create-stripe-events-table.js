'use strict';

/**
 * Migration: Create stripe_events table for webhook idempotency.
 * Stores processed Stripe event IDs to prevent duplicate processing.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stripe_events', {
      id: {
        type: Sequelize.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Stripe event ID (evt_xxx)',
      },
      type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      processedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'processed_at',
      },
    });

    // Index for cleanup queries (delete events older than 30 days)
    await queryInterface.addIndex('stripe_events', ['processed_at'], {
      name: 'idx_stripe_events_processed_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stripe_events');
  },
};
