/**
 * Integration tests for reservation management endpoints.
 */
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-automated-tests';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'hotelrestaurant_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres123';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';

let app, sequelize, token, guestId, roomId;

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
    username: 'resadmin',
    email: 'resadmin@test.com',
    password: 'AdminPass1!',
    firstName: 'Res',
    lastName: 'Admin',
    role: 'admin',
    isActive: true,
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'resadmin@test.com', password: 'AdminPass1!' });
  token = loginRes.body.token;

  const guestRes = await request(app)
    .post('/api/guests')
    .set('Authorization', `Bearer ${token}`)
    .send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@example.com',
      phone: '+1111111111',
      idType: 'passport',
      idNumber: 'CD789012',
    });
  guestId = guestRes.body.id;

  const roomRes = await request(app)
    .post('/api/rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({
      roomNumber: '201',
      type: 'double',
      floor: 2,
      pricePerNight: 150,
      status: 'available',
    });
  roomId = roomRes.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Reservations CRUD', () => {
  let reservationId;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 3);

  it('POST /api/reservations - should create a reservation', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        guestId,
        roomId,
        checkIn: tomorrow.toISOString().slice(0, 10),
        checkOut: dayAfter.toISOString().slice(0, 10),
        adults: 2,
        children: 0,
        specialRequests: 'Late check-in',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('confirmed');
    reservationId = res.body.id;
  });

  it('GET /api/reservations - should list reservations', async () => {
    const res = await request(app)
      .get('/api/reservations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.reservations.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/reservations/:id - should get specific reservation', async () => {
    const res = await request(app)
      .get(`/api/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.guestId).toBe(guestId);
    expect(res.body.roomId).toBe(roomId);
  });

  it('PUT /api/reservations/:id - should update reservation', async () => {
    const res = await request(app)
      .put(`/api/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        adults: 3,
        specialRequests: 'Extra pillow',
      });

    expect(res.status).toBe(200);
  });

  it('PUT /api/reservations/:id - check-in transition', async () => {
    const res = await request(app)
      .put(`/api/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'checked-in' });

    expect(res.status).toBe(200);
  });

  it('PUT /api/reservations/:id - check-out transition', async () => {
    const res = await request(app)
      .put(`/api/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'checked-out' });

    expect(res.status).toBe(200);
  });

  it('DELETE /api/reservations/:id - should soft-delete', async () => {
    const newRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        guestId,
        roomId,
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
        adults: 1,
      });

    const delRes = await request(app)
      .delete(`/api/reservations/${newRes.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);
  });
});
