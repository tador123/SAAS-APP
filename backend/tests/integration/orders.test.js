/**
 * Integration tests for order management endpoints.
 */
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-automated-tests';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'hotelrestaurant_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres123';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';

let app, sequelize, token, tableId, menuItemId;

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
    username: 'orderadmin',
    email: 'orderadmin@test.com',
    password: 'AdminPass1!',
    firstName: 'Order',
    lastName: 'Admin',
    role: 'admin',
    isActive: true,
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'orderadmin@test.com', password: 'AdminPass1!' });
  token = loginRes.body.token;

  // Create a restaurant table
  const tableRes = await request(app)
    .post('/api/restaurant/tables')
    .set('Authorization', `Bearer ${token}`)
    .send({ tableNumber: 'T1', capacity: 4, location: 'indoor', status: 'available' });
  tableId = tableRes.body.id;

  // Create a menu category + item
  const catRes = await request(app)
    .post('/api/restaurant/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Mains', description: 'Main courses' });

  const itemRes = await request(app)
    .post('/api/restaurant/menu-items')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Grilled Chicken',
      categoryId: catRes.body.id,
      price: 25.50,
      description: 'Juicy grilled chicken',
      isAvailable: true,
    });
  menuItemId = itemRes.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Orders CRUD', () => {
  let orderId;

  it('POST /api/orders - should create an order with server-calculated totals', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tableId,
        items: [{ menuItemId, quantity: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    // Server-side total calculation: 2 * 25.50 = 51.00
    expect(parseFloat(res.body.totalAmount)).toBeCloseTo(51.0, 1);
    orderId = res.body.id;
  });

  it('GET /api/orders - should list orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/orders/:id - should get order with items', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderId);
  });

  it('PATCH /api/orders/:id/status - should transition to preparing', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'preparing' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('preparing');
  });

  it('PATCH /api/orders/:id/status - should transition to ready', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ready' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('PATCH /api/orders/:id/status - should transition to delivered', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'delivered' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('delivered');
  });

  it('DELETE /api/orders/:id - should soft-delete', async () => {
    const newOrder = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ tableId, items: [{ menuItemId, quantity: 1 }] });

    const res = await request(app)
      .delete(`/api/orders/${newOrder.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
