/**
 * Integration tests for guest management endpoints.
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
    username: 'guestadmin',
    email: 'guestadmin@test.com',
    password: 'AdminPass1!',
    firstName: 'Guest',
    lastName: 'Admin',
    role: 'admin',
    isActive: true,
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'guestadmin@test.com', password: 'AdminPass1!' });
  token = loginRes.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Guests CRUD', () => {
  let guestId;

  it('POST /api/guests - should create a guest', async () => {
    const res = await request(app)
      .post('/api/guests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        idType: 'passport',
        idNumber: 'AB123456',
        nationality: 'US',
      });

    expect(res.status).toBe(201);
    expect(res.body.firstName).toBe('Jane');
    guestId = res.body.id;
  });

  it('GET /api/guests - should list guests', async () => {
    const res = await request(app)
      .get('/api/guests')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.guests.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/guests?search=Jane - should search guests', async () => {
    const res = await request(app)
      .get('/api/guests?search=Jane')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.guests.length).toBe(1);
    expect(res.body.guests[0].firstName).toBe('Jane');
  });

  it('GET /api/guests/:id - should get specific guest', async () => {
    const res = await request(app)
      .get(`/api/guests/${guestId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('jane@example.com');
  });

  it('PUT /api/guests/:id - should update a guest', async () => {
    const res = await request(app)
      .put(`/api/guests/${guestId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Jane',
        lastName: 'Smith-Updated',
        phone: '+0987654321',
      });

    expect(res.status).toBe(200);
    expect(res.body.lastName).toBe('Smith-Updated');
  });

  it('DELETE /api/guests/:id - should soft-delete a guest', async () => {
    const res = await request(app)
      .delete(`/api/guests/${guestId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
