/**
 * Integration tests for room management endpoints.
 */
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-automated-tests';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'hotelrestaurant_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres123';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';

let app, sequelize, token;

beforeAll(async () => {
  const models = require('../../src/models');
  sequelize = models.sequelize;

  const express = require('express');
  const routes = require('../../src/routes');
  const errorHandler = require('../../src/middleware/errorHandler');
  const requestIdMiddleware = require('../../src/middleware/requestId');

  app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());
  app.use('/api', routes);
  app.use(errorHandler);

  await sequelize.sync({ force: true });

  await models.User.create({
    username: 'roomadmin',
    email: 'roomadmin@test.com',
    password: 'AdminPass1!',
    firstName: 'Room',
    lastName: 'Admin',
    role: 'admin',
    isActive: true,
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'roomadmin@test.com', password: 'AdminPass1!' });
  token = loginRes.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Rooms CRUD', () => {
  let roomId;

  it('POST /api/rooms - should create a room', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomNumber: '101',
        type: 'double',
        floor: 1,
        price: 150.00,
        maxOccupancy: 2,
        amenities: ['wifi', 'tv'],
        description: 'Standard double room',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.roomNumber).toBe('101');
    expect(res.body.price).toBe('150.00');
    roomId = res.body.id;
  });

  it('GET /api/rooms - should list rooms', async () => {
    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.rooms.length).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('pagination');
  });

  it('GET /api/rooms/:id - should get a specific room', async () => {
    const res = await request(app)
      .get(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.roomNumber).toBe('101');
  });

  it('GET /api/rooms?status=available - should filter by status', async () => {
    const res = await request(app)
      .get('/api/rooms?status=available')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.rooms.forEach(room => {
      expect(room.status).toBe('available');
    });
  });

  it('PUT /api/rooms/:id - should update a room', async () => {
    const res = await request(app)
      .put(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 175.00, description: 'Updated double room' });

    expect(res.status).toBe(200);
    expect(res.body.price).toBe('175.00');
    expect(res.body.description).toBe('Updated double room');
  });

  it('DELETE /api/rooms/:id - should soft-delete a room', async () => {
    const res = await request(app)
      .delete(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    // Room should not appear in regular queries
    const getRes = await request(app)
      .get(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(404);
  });

  it('GET /api/rooms/:id - should return 404 for non-existent room', async () => {
    const res = await request(app)
      .get('/api/rooms/99999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
