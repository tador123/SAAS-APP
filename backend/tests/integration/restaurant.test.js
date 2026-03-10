/**
 * Integration tests for restaurant management endpoints.
 * Covers: categories, menu items, tables.
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
    username: 'restadmin',
    email: 'restadmin@test.com',
    password: 'AdminPass1!',
    firstName: 'Rest',
    lastName: 'Admin',
    role: 'admin',
    isActive: true,
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'restadmin@test.com', password: 'AdminPass1!' });
  token = loginRes.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Menu Categories', () => {
  let categoryId;

  it('POST /api/restaurant/categories - should create category', async () => {
    const res = await request(app)
      .post('/api/restaurant/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Appetizers', description: 'Starters' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Appetizers');
    categoryId = res.body.id;
  });

  it('GET /api/restaurant/categories - should list categories', async () => {
    const res = await request(app)
      .get('/api/restaurant/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('DELETE /api/restaurant/categories/:id - should soft-delete', async () => {
    const res = await request(app)
      .delete(`/api/restaurant/categories/${categoryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

describe('Menu Items', () => {
  let categoryId, menuItemId;

  beforeAll(async () => {
    const catRes = await request(app)
      .post('/api/restaurant/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Desserts', description: 'Sweet treats' });
    categoryId = catRes.body.id;
  });

  it('POST /api/restaurant/menu-items - should create menu item', async () => {
    const res = await request(app)
      .post('/api/restaurant/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Chocolate Cake',
        categoryId,
        price: 12.99,
        description: 'Rich chocolate cake',
        isAvailable: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Chocolate Cake');
    menuItemId = res.body.id;
  });

  it('GET /api/restaurant/menu-items - should list items', async () => {
    const res = await request(app)
      .get('/api/restaurant/menu-items')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PUT /api/restaurant/menu-items/:id - should update item', async () => {
    const res = await request(app)
      .put(`/api/restaurant/menu-items/${menuItemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 14.99 });

    expect(res.status).toBe(200);
  });

  it('DELETE /api/restaurant/menu-items/:id - should soft-delete', async () => {
    const res = await request(app)
      .delete(`/api/restaurant/menu-items/${menuItemId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

describe('Restaurant Tables', () => {
  let tableId;

  it('POST /api/restaurant/tables - should create table', async () => {
    const res = await request(app)
      .post('/api/restaurant/tables')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tableNumber: 'A1',
        capacity: 6,
        location: 'patio',
        status: 'available',
      });

    expect(res.status).toBe(201);
    expect(res.body.tableNumber).toBe('A1');
    tableId = res.body.id;
  });

  it('GET /api/restaurant/tables - should list tables', async () => {
    const res = await request(app)
      .get('/api/restaurant/tables')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PUT /api/restaurant/tables/:id - should update table', async () => {
    const res = await request(app)
      .put(`/api/restaurant/tables/${tableId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'occupied' });

    expect(res.status).toBe(200);
  });

  it('DELETE /api/restaurant/tables/:id - should soft-delete', async () => {
    const res = await request(app)
      .delete(`/api/restaurant/tables/${tableId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
