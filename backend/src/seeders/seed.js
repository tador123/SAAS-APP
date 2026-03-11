const bcrypt = require('bcryptjs');
const { User, Room, Guest, MenuCategory, MenuItem, RestaurantTable } = require('../models');
const Property = require('../models/Property');

const seed = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ where: { email: 'admin@hotel.com' } });
    if (existingAdmin) {
      require('../services/logger').info('Database already seeded. Skipping...');
      return;
    }

    require('../services/logger').info('Seeding database with initial data...');

    // Create system admin user (platform-level, no property)
    const sysAdminPassword = process.env.SYSTEM_ADMIN_PASSWORD || 'SysAdmin@2024!';
    const existingSysAdmin = await User.findOne({ where: { role: 'system_admin' } });
    if (!existingSysAdmin) {
      await User.create({
        username: 'sysadmin',
        email: 'sysadmin@hotelware.in',
        password: await bcrypt.hash(sysAdminPassword, 12),
        firstName: 'System',
        lastName: 'Administrator',
        role: 'system_admin',
        phone: '+0000000000',
        propertyId: null,
      });
      require('../services/logger').info('System admin created: sysadmin@hotelware.in');
    }

    // Create default property (pre-approved)
    const [property] = await Property.findOrCreate({
      where: { slug: 'default-hotel' },
      defaults: {
        name: 'HotelWare Demo',
        slug: 'default-hotel',
        address: '123 Main Street, City, Country',
        phone: '+1234567890',
        email: 'info@hotel.com',
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
        subscriptionPlan: 'premium',
        approvalStatus: 'approved',
        settings: { taxRate: 10, checkInTime: '14:00', checkOutTime: '11:00' },
      },
    });
    const propertyId = property.id;

    // Create admin user (using model hooks for hashing)
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@Hotel2024!';
    await User.bulkCreate([
      {
        username: 'admin',
        email: 'admin@hotel.com',
        password: await bcrypt.hash(defaultPassword, 12),
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin',
        phone: '+1234567890',
        subscriptionPlan: 'premium',
        propertyId,
      },
      {
        username: 'manager',
        email: 'manager@hotel.com',
        password: await bcrypt.hash(defaultPassword, 12),
        firstName: 'Hotel',
        lastName: 'Manager',
        role: 'manager',
        phone: '+1234567891',
        propertyId,
      },
      {
        username: 'receptionist',
        email: 'reception@hotel.com',
        password: await bcrypt.hash(defaultPassword, 12),
        firstName: 'Front',
        lastName: 'Desk',
        role: 'receptionist',
        phone: '+1234567892',
        propertyId,
      },
    ]);

    // Create rooms
    const rooms = [];
    const roomTypes = ['single', 'double', 'twin', 'suite', 'deluxe'];
    const prices = { single: 79.99, double: 119.99, twin: 109.99, suite: 249.99, deluxe: 199.99 };
    const amenitiesMap = {
      single: ['WiFi', 'TV', 'AC', 'Mini Bar'],
      double: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Room Service'],
      twin: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Room Service'],
      suite: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Room Service', 'Jacuzzi', 'Balcony', 'Living Room'],
      deluxe: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Room Service', 'Balcony', 'King Bed'],
    };

    for (let floor = 1; floor <= 4; floor++) {
      for (let room = 1; room <= 5; room++) {
        const typeIndex = (floor - 1 + room - 1) % roomTypes.length;
        const type = roomTypes[typeIndex];
        rooms.push({
          roomNumber: `${floor}${room.toString().padStart(2, '0')}`,
          type,
          floor,
          price: prices[type],
          status: 'available',
          amenities: amenitiesMap[type],
          maxOccupancy: type === 'suite' ? 4 : type === 'single' ? 1 : 2,
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} room on floor ${floor}`,
          propertyId,
        });
      }
    }
    await Room.bulkCreate(rooms);

    // Create sample guests
    await Guest.bulkCreate([
      { firstName: 'John', lastName: 'Smith', email: 'john@example.com', phone: '+1555000001', nationality: 'US', idType: 'passport', idNumber: 'US123456', propertyId },
      { firstName: 'Emma', lastName: 'Johnson', email: 'emma@example.com', phone: '+1555000002', nationality: 'UK', idType: 'passport', idNumber: 'UK789012', propertyId },
      { firstName: 'Carlos', lastName: 'Garcia', email: 'carlos@example.com', phone: '+1555000003', nationality: 'ES', idType: 'national_id', idNumber: 'ES345678', propertyId },
      { firstName: 'Yuki', lastName: 'Tanaka', email: 'yuki@example.com', phone: '+1555000004', nationality: 'JP', idType: 'passport', idNumber: 'JP901234', vipStatus: true, propertyId },
      { firstName: 'Marie', lastName: 'Dupont', email: 'marie@example.com', phone: '+1555000005', nationality: 'FR', idType: 'national_id', idNumber: 'FR567890', propertyId },
    ]);

    // Create menu categories
    const categories = await MenuCategory.bulkCreate([
      { name: 'Appetizers', description: 'Starters and light bites', sortOrder: 1, propertyId },
      { name: 'Main Course', description: 'Signature dishes and entrees', sortOrder: 2, propertyId },
      { name: 'Desserts', description: 'Sweet treats and pastries', sortOrder: 3, propertyId },
      { name: 'Beverages', description: 'Drinks and refreshments', sortOrder: 4, propertyId },
      { name: 'Breakfast', description: 'Morning meals and buffet items', sortOrder: 5, propertyId },
    ]);

    // Create menu items
    await MenuItem.bulkCreate([
      // Appetizers
      { categoryId: categories[0].id, name: 'Caesar Salad', description: 'Fresh romaine, parmesan, croutons', price: 12.99, preparationTime: 10, isVegetarian: true },
      { categoryId: categories[0].id, name: 'Shrimp Cocktail', description: 'Jumbo shrimp with cocktail sauce', price: 16.99, preparationTime: 8 },
      { categoryId: categories[0].id, name: 'Bruschetta', description: 'Toasted bread with tomato basil', price: 9.99, preparationTime: 7, isVegetarian: true, isVegan: true },
      { categoryId: categories[0].id, name: 'Soup of the Day', description: 'Chef\'s daily selection', price: 8.99, preparationTime: 5 },
      // Main Course
      { categoryId: categories[1].id, name: 'Grilled Salmon', description: 'Atlantic salmon with lemon butter', price: 28.99, preparationTime: 20 },
      { categoryId: categories[1].id, name: 'Ribeye Steak', description: '12oz USDA prime with sides', price: 38.99, preparationTime: 25 },
      { categoryId: categories[1].id, name: 'Chicken Parmesan', description: 'Breaded chicken with marinara', price: 22.99, preparationTime: 18 },
      { categoryId: categories[1].id, name: 'Pasta Primavera', description: 'Seasonal vegetables in cream sauce', price: 18.99, preparationTime: 15, isVegetarian: true },
      { categoryId: categories[1].id, name: 'Lamb Chops', description: 'Herb-crusted with mint sauce', price: 34.99, preparationTime: 22 },
      // Desserts
      { categoryId: categories[2].id, name: 'Tiramisu', description: 'Classic Italian dessert', price: 10.99, preparationTime: 5, isVegetarian: true },
      { categoryId: categories[2].id, name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with ice cream', price: 12.99, preparationTime: 12, isVegetarian: true },
      { categoryId: categories[2].id, name: 'Cheesecake', description: 'New York style with berry compote', price: 9.99, preparationTime: 5, isVegetarian: true },
      // Beverages
      { categoryId: categories[3].id, name: 'Fresh Orange Juice', description: 'Freshly squeezed', price: 5.99, preparationTime: 3, isVegetarian: true, isVegan: true },
      { categoryId: categories[3].id, name: 'Coffee', description: 'House blend or espresso', price: 3.99, preparationTime: 3, isVegetarian: true, isVegan: true },
      { categoryId: categories[3].id, name: 'Sparkling Water', description: 'San Pellegrino 750ml', price: 4.99, preparationTime: 1, isVegetarian: true, isVegan: true },
      { categoryId: categories[3].id, name: 'House Wine', description: 'Red or white, glass', price: 9.99, preparationTime: 2, isVegetarian: true },
      // Breakfast
      { categoryId: categories[4].id, name: 'Full English Breakfast', description: 'Eggs, bacon, sausage, beans, toast', price: 15.99, preparationTime: 15 },
      { categoryId: categories[4].id, name: 'Pancake Stack', description: 'Buttermilk pancakes with maple syrup', price: 11.99, preparationTime: 10, isVegetarian: true },
      { categoryId: categories[4].id, name: 'Eggs Benedict', description: 'Poached eggs on English muffin', price: 13.99, preparationTime: 12 },
    ]);

    // Create restaurant tables
    const tables = [];
    for (let i = 1; i <= 12; i++) {
      tables.push({
        tableNumber: `T${i.toString().padStart(2, '0')}`,
        capacity: i <= 4 ? 2 : i <= 8 ? 4 : i <= 10 ? 6 : 8,
        location: i <= 8 ? 'indoor' : i <= 10 ? 'outdoor' : 'terrace',
        status: 'available',
        propertyId,
      });
    }
    await RestaurantTable.bulkCreate(tables);

    require('../services/logger').info('Database seeded successfully!');
    require('../services/logger').info('System Admin login: sysadmin@hotelware.in / [see SYSTEM_ADMIN_PASSWORD env var]');
    require('../services/logger').info('Property Admin login: admin@hotel.com / [see ADMIN_DEFAULT_PASSWORD env var]');
  } catch (error) {
    require('../services/logger').error('Seeding error', { error: error.message });
  }
};

module.exports = seed;
