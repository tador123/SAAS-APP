/**
 * Test setup — shared utilities for all test files.
 * Uses in-memory SQLite for speed, or a test PostgreSQL DB if configured.
 */
const { Sequelize } = require('sequelize');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-automated-tests';

// Silence console output during tests
if (!process.env.TEST_VERBOSE) {
  console.log = jest.fn();
  console.info = jest.fn();
}

module.exports = {};
