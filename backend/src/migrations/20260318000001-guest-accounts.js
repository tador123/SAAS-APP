'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add authentication columns to guests table for guest accounts
    await queryInterface.addColumn('guests', 'passwordHash', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('guests', 'emailVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('guests', 'emailVerifyToken', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('guests', 'emailVerifyExpires', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('guests', 'avatar', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Add consumer-facing columns to properties table
    await queryInterface.addColumn('properties', 'type', {
      type: Sequelize.ENUM('hotel', 'restaurant', 'resort', 'boutique_hotel', 'hostel'),
      defaultValue: 'hotel',
    });
    await queryInterface.addColumn('properties', 'city', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('properties', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('properties', 'amenities', {
      type: Sequelize.JSONB,
      defaultValue: [],
    });
    await queryInterface.addColumn('properties', 'images', {
      type: Sequelize.JSONB,
      defaultValue: [],
    });
    await queryInterface.addColumn('properties', 'stars', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('properties', 'website', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('properties', 'latitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
    await queryInterface.addColumn('properties', 'longitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });

    // Create guest_refresh_tokens table for guest JWT refresh
    await queryInterface.createTable('guest_refresh_tokens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'guests', key: 'id' },
        onDelete: 'CASCADE',
      },
      token: { type: Sequelize.STRING, allowNull: false, unique: true },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('guest_refresh_tokens');
    await queryInterface.removeColumn('guests', 'passwordHash');
    await queryInterface.removeColumn('guests', 'emailVerified');
    await queryInterface.removeColumn('guests', 'emailVerifyToken');
    await queryInterface.removeColumn('guests', 'emailVerifyExpires');
    await queryInterface.removeColumn('guests', 'avatar');
    await queryInterface.removeColumn('properties', 'type');
    await queryInterface.removeColumn('properties', 'city');
    await queryInterface.removeColumn('properties', 'description');
    await queryInterface.removeColumn('properties', 'amenities');
    await queryInterface.removeColumn('properties', 'images');
    await queryInterface.removeColumn('properties', 'stars');
    await queryInterface.removeColumn('properties', 'website');
    await queryInterface.removeColumn('properties', 'latitude');
    await queryInterface.removeColumn('properties', 'longitude');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_properties_type";');
  },
};
