/**
 * Unit tests for middleware functions.
 */
const { generateTestToken } = require('../helpers');

// ─── requestId middleware ────────────────────────────────
describe('requestId middleware', () => {
  const requestId = require('../../src/middleware/requestId');

  const mockRes = () => {
    const res = {};
    res.setHeader = jest.fn();
    return res;
  };

  it('should generate a UUID when no X-Request-Id header is present', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    requestId(req, res, next);

    expect(req.id).toBeDefined();
    expect(req.id).toMatch(/^[0-9a-f-]{36}$/); // UUID v4 format
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalled();
  });

  it('should use X-Request-Id header when present', () => {
    const req = { headers: { 'x-request-id': 'custom-id-123' } };
    const res = mockRes();
    const next = jest.fn();

    requestId(req, res, next);

    expect(req.id).toBe('custom-id-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'custom-id-123');
    expect(next).toHaveBeenCalled();
  });
});

// ─── tenantScope middleware ──────────────────────────────
describe('tenantScope middleware', () => {
  const { tenantScope, optionalTenantScope } = require('../../src/middleware/tenantScope');

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    return res;
  };

  it('should set req.propertyId from user', () => {
    const req = { user: { propertyId: 5, role: 'manager' }, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    tenantScope(req, res, next);

    expect(req.propertyId).toBe(5);
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when user has no propertyId', () => {
    const req = { user: { role: 'staff' }, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    tenantScope(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow admin to override via X-Property-Id header', () => {
    const req = { user: { propertyId: 1, role: 'admin' }, headers: { 'x-property-id': '99' } };
    const res = mockRes();
    const next = jest.fn();

    tenantScope(req, res, next);

    expect(req.propertyId).toBe(99);
    expect(next).toHaveBeenCalled();
  });

  it('optionalTenantScope should not block missing propertyId', () => {
    const req = { user: { role: 'admin' }, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    optionalTenantScope(req, res, next);

    expect(req.propertyId).toBeNull();
    expect(next).toHaveBeenCalled();
  });
});

// ─── errorHandler middleware ─────────────────────────────
describe('errorHandler middleware', () => {
  const errorHandler = require('../../src/middleware/errorHandler');

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    return res;
  };

  it('should handle SequelizeValidationError with 400', () => {
    const err = { name: 'SequelizeValidationError', errors: [{ path: 'email', message: 'invalid email' }] };
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation error' })
    );
  });

  it('should handle SequelizeUniqueConstraintError with 409', () => {
    const err = { name: 'SequelizeUniqueConstraintError', errors: [{ path: 'email', message: 'email exists' }] };
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('should handle SequelizeForeignKeyConstraintError with 400', () => {
    const err = { name: 'SequelizeForeignKeyConstraintError' };
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle generic errors with 500', () => {
    const err = new Error('Something broke');
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should include requestId in response', () => {
    const err = new Error('fail');
    const req = { id: 'test-request-id' };
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'test-request-id' })
    );
  });
});
