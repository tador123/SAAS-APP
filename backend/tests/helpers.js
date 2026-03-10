/**
 * Test helpers — shared utilities for creating test data,
 * making authenticated requests, and managing the test database.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-automated-tests';

/**
 * Generate a JWT for a test user.
 */
function generateTestToken(user = {}) {
  const payload = {
    id: user.id || 1,
    email: user.email || 'admin@test.com',
    role: user.role || 'admin',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Create headers with authorization token.
 */
function authHeader(user = {}) {
  return {
    Authorization: `Bearer ${generateTestToken(user)}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Factory for creating test entities.
 */
const factories = {
  user: (overrides = {}) => ({
    username: `user_${Date.now()}`,
    email: `user_${Date.now()}@test.com`,
    password: 'TestPass1!',
    firstName: 'Test',
    lastName: 'User',
    role: 'staff',
    isActive: true,
    ...overrides,
  }),

  room: (overrides = {}) => ({
    roomNumber: `R${Date.now() % 10000}`,
    type: 'double',
    floor: 1,
    price: 100.00,
    status: 'available',
    maxOccupancy: 2,
    ...overrides,
  }),

  guest: (overrides = {}) => ({
    firstName: 'John',
    lastName: 'Doe',
    email: `guest_${Date.now()}@test.com`,
    phone: '+1234567890',
    ...overrides,
  }),

  menuCategory: (overrides = {}) => ({
    name: `Category ${Date.now() % 1000}`,
    description: 'Test category',
    sortOrder: 0,
    isActive: true,
    ...overrides,
  }),

  menuItem: (overrides = {}) => ({
    name: `Item ${Date.now() % 1000}`,
    price: 12.99,
    isAvailable: true,
    preparationTime: 15,
    ...overrides,
  }),

  restaurantTable: (overrides = {}) => ({
    tableNumber: `T${Date.now() % 10000}`,
    capacity: 4,
    status: 'available',
    location: 'indoor',
    ...overrides,
  }),

  reservation: (overrides = {}) => ({
    checkIn: '2026-04-01',
    checkOut: '2026-04-03',
    adults: 2,
    children: 0,
    totalAmount: 200.00,
    status: 'pending',
    source: 'website',
    ...overrides,
  }),
};

module.exports = {
  generateTestToken,
  authHeader,
  factories,
  JWT_SECRET,
};
