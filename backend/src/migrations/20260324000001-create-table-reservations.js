'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('table_reservations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      tableId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'restaurant_tables', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      guestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'guests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reservationDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      reservationTime: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      partySize: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 2,
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'),
        defaultValue: 'pending',
      },
      specialRequests: {
        type: Sequelize.TEXT,
      },
      preOrderItems: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      preOrderTotal: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('table_reservations', ['tableId']);
    await queryInterface.addIndex('table_reservations', ['guestId']);
    await queryInterface.addIndex('table_reservations', ['propertyId']);
    await queryInterface.addIndex('table_reservations', ['reservationDate']);
    await queryInterface.addIndex('table_reservations', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('table_reservations');
  },
};
