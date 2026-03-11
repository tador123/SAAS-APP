/**
 * Integration tests for invoice management endpoints.
 */
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-automated-tests';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'hotelrestaurant_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres123';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';

let app, sequelize, token, guestId, reservationId, roomId;

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

  // Create sequences needed for invoice number generation
  await sequelize.query('CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1;');

  const Property = require('../../src/models/Property');
  const property = await Property.create({ name: 'Test Hotel', slug: 'test-hotel', isActive: true, subscriptionPlan: 'premium' });

  await models.User.create({
    username: 'invadmin',
    email: 'invadmin@test.com',
    password: 'AdminPass1!',
    firstName: 'Inv',
    lastName: 'Admin',
    role: 'admin',
    isActive: true,
    propertyId: property.id,
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'invadmin@test.com', password: 'AdminPass1!' });
  token = loginRes.body.token;

  const guestRes = await request(app)
    .post('/api/guests')
    .set('Authorization', `Bearer ${token}`)
    .send({
      firstName: 'Invoice',
      lastName: 'Guest',
      email: 'invoiceguest@example.com',
      phone: '+1222333444',
      idType: 'passport',
      idNumber: 'EF345678',
    });
  guestId = guestRes.body.id;

  const roomRes = await request(app)
    .post('/api/rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({
      roomNumber: '301',
      type: 'suite',
      floor: 3,
      price: 300,
      status: 'available',
    });
  roomId = roomRes.body.id;

  const resRes = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${token}`)
    .send({
      guestId,
      roomId,
      checkIn: '2026-07-01',
      checkOut: '2026-07-03',
      totalAmount: 600,
      adults: 2,
    });
  reservationId = resRes.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Invoices CRUD', () => {
  let invoiceId;

  it('POST /api/invoices - should create an invoice', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        guestId,
        reservationId,
        items: [
          { description: 'Room charges (2 nights)', unitPrice: 600, quantity: 1 },
          { description: 'Room service', unitPrice: 45.50, quantity: 1 },
        ],
        taxRate: 10,
        discount: 0,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    invoiceId = res.body.id;
  });

  it('GET /api/invoices - should list invoices', async () => {
    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/invoices/:id - should get specific invoice', async () => {
    const res = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.guestId).toBe(guestId);
  });

  it('PATCH /api/invoices/:id/pay - should mark invoice as paid', async () => {
    const res = await request(app)
      .patch(`/api/invoices/${invoiceId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'credit_card' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paid');
  });

  it('POST /api/invoices (second) + void - should void an invoice', async () => {
    const createRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        guestId,
        reservationId,
        items: [{ description: 'Cancelled service', unitPrice: 100, quantity: 1 }],
        taxRate: 0,
        discount: 0,
      });

    const voidRes = await request(app)
      .patch(`/api/invoices/${createRes.body.id}/void`)
      .set('Authorization', `Bearer ${token}`);

    expect(voidRes.status).toBe(200);
    expect(voidRes.body.status).toBe('void');
  });

  it('PATCH /api/invoices/:id/void - should void a new invoice', async () => {
    const newInv = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        guestId,
        items: [{ description: 'To void', unitPrice: 10, quantity: 1 }],
        taxRate: 0,
        discount: 0,
      });

    const res = await request(app)
      .patch(`/api/invoices/${newInv.body.id}/void`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('void');
  });
});
