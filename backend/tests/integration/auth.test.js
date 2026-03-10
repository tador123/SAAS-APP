/**
 * Integration tests for authentication endpoints.
 * Uses supertest to make HTTP requests against the Express app.
 *
 * Requires a running PostgreSQL test database.
 * Set TEST_DB_NAME, TEST_DB_USER, TEST_DB_PASSWORD in env or use defaults.
 */
const request = require('supertest');

// Mock environment before imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-automated-tests';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'hotelrestaurant_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres123';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';

let app;
let sequelize;

beforeAll(async () => {
  // Dynamic import to ensure env vars are set first
  const models = require('../../src/models');
  sequelize = models.sequelize;

  // Build express app (without starting the listener)
  const express = require('express');
  const helmet = require('helmet');
  const routes = require('../../src/routes');
  const errorHandler = require('../../src/middleware/errorHandler');
  const requestIdMiddleware = require('../../src/middleware/requestId');

  app = express();
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(express.json());
  app.use('/api', routes);
  app.use(errorHandler);

  // Sync all models (creates tables in test DB)
  await sequelize.sync({ force: true });

  // Create an admin user for auth tests
  const User = models.User;
  await User.create({
    username: 'testadmin',
    email: 'admin@test.com',
    password: 'AdminPass1!',
    firstName: 'Admin',
    lastName: 'Test',
    role: 'admin',
    isActive: true,
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPass1!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toHaveProperty('email', 'admin@test.com');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPassword1!' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should reject missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPass1!' });
    token = res.body.token;
  });

  it('should return authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', 'admin@test.com');
    expect(res.body).toHaveProperty('role', 'admin');
  });

  it('should reject requests without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should reject invalid tokens', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/register', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPass1!' });
    token = res.body.token;
  });

  it('should create a new user (admin only)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'newstaff',
        email: 'newstaff@test.com',
        password: 'StaffPass1!',
        firstName: 'New',
        lastName: 'Staff',
        role: 'waiter',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toHaveProperty('email', 'newstaff@test.com');
    expect(res.body.user).toHaveProperty('role', 'waiter');
  });

  it('should reject weak passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'weakpwd',
        email: 'weak@test.com',
        password: 'short',
        firstName: 'Weak',
        lastName: 'Pwd',
      });

    expect(res.status).toBe(400);
  });

  it('should reject duplicate emails', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'dupe_admin',
        email: 'admin@test.com', // already exists
        password: 'AdminPass1!',
        firstName: 'Dupe',
        lastName: 'Admin',
      });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPass1!' });
    refreshToken = res.body.refreshToken;
  });

  it('should return new token pair', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    // Old refresh token should be revoked (rotation)
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it('should reject reused (revoked) refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken }); // already used above

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('should always return 200 (prevent email enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'admin@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password reset/i);
  });

  it('should return 200 even for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@test.com' });

    expect(res.status).toBe(200);
  });
});
