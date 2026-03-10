'use strict';

/**
 * Initial migration — creates all tables matching the Sequelize model definitions.
 * This replaces the previous `sequelize.sync()` approach.
 */
module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    // Users
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      email: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      firstName: { type: Sequelize.STRING(50), allowNull: false },
      lastName: { type: Sequelize.STRING(50), allowNull: false },
      role: { type: Sequelize.ENUM('admin', 'manager', 'receptionist', 'waiter', 'chef', 'staff'), defaultValue: 'staff' },
      phone: { type: Sequelize.STRING(20) },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      subscriptionPlan: { type: Sequelize.ENUM('free', 'basic', 'premium', 'enterprise'), defaultValue: 'free' },
      lastLogin: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    }, { transaction });

    // Rooms
    await queryInterface.createTable('rooms', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      roomNumber: { type: Sequelize.STRING(10), allowNull: false, unique: true },
      type: { type: Sequelize.ENUM('single', 'double', 'twin', 'suite', 'deluxe', 'penthouse'), allowNull: false },
      floor: { type: Sequelize.INTEGER, allowNull: false },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      status: { type: Sequelize.ENUM('available', 'occupied', 'reserved', 'maintenance', 'cleaning'), defaultValue: 'available' },
      amenities: { type: Sequelize.JSON, defaultValue: [] },
      description: { type: Sequelize.TEXT },
      maxOccupancy: { type: Sequelize.INTEGER, defaultValue: 2 },
      images: { type: Sequelize.JSON, defaultValue: [] },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    }, { transaction });

    // Guests
    await queryInterface.createTable('guests', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      firstName: { type: Sequelize.STRING(50), allowNull: false },
      lastName: { type: Sequelize.STRING(50), allowNull: false },
      email: { type: Sequelize.STRING(100) },
      phone: { type: Sequelize.STRING(20), allowNull: false },
      idType: { type: Sequelize.ENUM('passport', 'national_id', 'drivers_license', 'other') },
      idNumber: { type: Sequelize.STRING(50) },
      nationality: { type: Sequelize.STRING(50) },
      address: { type: Sequelize.TEXT },
      dateOfBirth: { type: Sequelize.DATEONLY },
      vipStatus: { type: Sequelize.BOOLEAN, defaultValue: false },
      notes: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    }, { transaction });

    // Menu Categories
    await queryInterface.createTable('menu_categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT },
      sortOrder: { type: Sequelize.INTEGER, defaultValue: 0 },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    }, { transaction });

    // Menu Items
    await queryInterface.createTable('menu_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      categoryId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'menu_categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      image: { type: Sequelize.STRING },
      isAvailable: { type: Sequelize.BOOLEAN, defaultValue: true },
      preparationTime: { type: Sequelize.INTEGER },
      allergens: { type: Sequelize.JSON, defaultValue: [] },
      isVegetarian: { type: Sequelize.BOOLEAN, defaultValue: false },
      isVegan: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    }, { transaction });

    // Restaurant Tables
    await queryInterface.createTable('restaurant_tables', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tableNumber: { type: Sequelize.STRING(10), allowNull: false, unique: true },
      capacity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 4 },
      status: { type: Sequelize.ENUM('available', 'occupied', 'reserved', 'maintenance'), defaultValue: 'available' },
      location: { type: Sequelize.ENUM('indoor', 'outdoor', 'terrace', 'private'), defaultValue: 'indoor' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    }, { transaction });

    // Reservations
    await queryInterface.createTable('reservations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guestId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'guests', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      roomId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'rooms', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      checkIn: { type: Sequelize.DATEONLY, allowNull: false },
      checkOut: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'), defaultValue: 'pending' },
      adults: { type: Sequelize.INTEGER, defaultValue: 1 },
      children: { type: Sequelize.INTEGER, defaultValue: 0 },
      totalAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      paidAmount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      specialRequests: { type: Sequelize.TEXT },
      source: { type: Sequelize.ENUM('walk_in', 'phone', 'website', 'booking_com', 'airbnb', 'other'), defaultValue: 'walk_in' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    }, { transaction });

    // Reservation indexes
    await queryInterface.addIndex('reservations', ['guestId'], { transaction });
    await queryInterface.addIndex('reservations', ['roomId'], { transaction });
    await queryInterface.addIndex('reservations', ['status'], { transaction });
    await queryInterface.addIndex('reservations', ['checkIn'], { transaction });
    await queryInterface.addIndex('reservations', ['checkOut'], { transaction });
    await queryInterface.addIndex('reservations', ['roomId', 'checkIn', 'checkOut'], { transaction });

    // Orders
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      orderNumber: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      tableId: { type: Sequelize.INTEGER, references: { model: 'restaurant_tables', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      guestId: { type: Sequelize.INTEGER, references: { model: 'guests', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      reservationId: { type: Sequelize.INTEGER, references: { model: 'reservations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      items: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
      orderType: { type: Sequelize.ENUM('dine_in', 'room_service', 'takeaway'), defaultValue: 'dine_in' },
      status: { type: Sequelize.ENUM('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'), defaultValue: 'pending' },
      subtotal: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      tax: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      discount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      notes: { type: Sequelize.TEXT },
      servedBy: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    }, { transaction });

    // Order indexes
    await queryInterface.addIndex('orders', ['tableId'], { transaction });
    await queryInterface.addIndex('orders', ['guestId'], { transaction });
    await queryInterface.addIndex('orders', ['status'], { transaction });
    await queryInterface.addIndex('orders', ['createdAt'], { transaction });

    // Invoices
    await queryInterface.createTable('invoices', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      invoiceNumber: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      guestId: { type: Sequelize.INTEGER, references: { model: 'guests', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      reservationId: { type: Sequelize.INTEGER, references: { model: 'reservations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      items: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
      subtotal: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      tax: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      discount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      status: { type: Sequelize.ENUM('draft', 'pending', 'paid', 'overdue', 'void', 'refunded'), defaultValue: 'pending' },
      paymentMethod: { type: Sequelize.ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'online', 'other') },
      paidAt: { type: Sequelize.DATE },
      dueDate: { type: Sequelize.DATEONLY },
      notes: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    }, { transaction });

    // Invoice indexes
    await queryInterface.addIndex('invoices', ['guestId'], { transaction });
    await queryInterface.addIndex('invoices', ['reservationId'], { transaction });
    await queryInterface.addIndex('invoices', ['status'], { transaction });
    await queryInterface.addIndex('invoices', ['paidAt'], { transaction });

    // Create DB sequences for order and invoice number generation
    await queryInterface.sequelize.query(
      `CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1 INCREMENT BY 1;`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1;`,
      { transaction }
    );

    // Audit log table
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      action: { type: Sequelize.ENUM('create', 'update', 'delete', 'login', 'logout', 'status_change'), allowNull: false },
      entityType: { type: Sequelize.STRING(50), allowNull: false },
      entityId: { type: Sequelize.INTEGER },
      changes: { type: Sequelize.JSON },
      ipAddress: { type: Sequelize.STRING(45) },
      userAgent: { type: Sequelize.STRING(500) },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    }, { transaction });

    await queryInterface.addIndex('audit_logs', ['userId'], { transaction });
    await queryInterface.addIndex('audit_logs', ['entityType', 'entityId'], { transaction });
    await queryInterface.addIndex('audit_logs', ['createdAt'], { transaction });
    await queryInterface.addIndex('audit_logs', ['action'], { transaction });

    // Refresh tokens table
    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      token: { type: Sequelize.STRING(500), allowNull: false, unique: true },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    }, { transaction });

    await queryInterface.addIndex('refresh_tokens', ['token'], { transaction });
    await queryInterface.addIndex('refresh_tokens', ['userId'], { transaction });
    await queryInterface.addIndex('refresh_tokens', ['expiresAt'], { transaction });
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable('refresh_tokens', { transaction });
    await queryInterface.dropTable('audit_logs', { transaction });
    await queryInterface.dropTable('invoices', { transaction });
    await queryInterface.dropTable('orders', { transaction });
    await queryInterface.dropTable('reservations', { transaction });
    await queryInterface.dropTable('restaurant_tables', { transaction });
    await queryInterface.dropTable('menu_items', { transaction });
    await queryInterface.dropTable('menu_categories', { transaction });
    await queryInterface.dropTable('guests', { transaction });
    await queryInterface.dropTable('rooms', { transaction });
    await queryInterface.dropTable('users', { transaction });
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS order_number_seq;', { transaction });
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS invoice_number_seq;', { transaction });
  },
};
