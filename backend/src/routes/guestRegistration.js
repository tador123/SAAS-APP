const router = require('express').Router();
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');
const { Guest, Property } = require('../models');
const { authenticate } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');

// ── Public endpoints (no auth — used by guests self-registering) ──

// POST /api/guest-register/:propertyId — Guest self-registration (public)
router.post('/:propertyId', [
  param('propertyId').isInt({ min: 1 }),
  body('firstName').trim().notEmpty().withMessage('First name is required').escape(),
  body('lastName').trim().notEmpty().withMessage('Last name is required').escape(),
  body('phone').trim().notEmpty().withMessage('Phone number is required').escape(),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  body('idType').optional({ nullable: true }).isIn(['passport', 'national_id', 'drivers_license', 'other']),
  body('idNumber').optional({ nullable: true }).trim().escape(),
  body('nationality').optional({ nullable: true }).trim().escape(),
  body('address').optional({ nullable: true }).trim().escape(),
  body('dateOfBirth').optional({ nullable: true }).isDate(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const propertyId = parseInt(req.params.propertyId);

    // Verify the property exists and is active
    const property = await Property.findOne({
      where: { id: propertyId, isActive: true, approvalStatus: 'approved' },
    });
    if (!property) {
      return res.status(404).json({ error: 'Property not found or not active' });
    }

    const { firstName, lastName, phone, email, idType, idNumber, nationality, address, dateOfBirth } = req.body;

    // Generate unique QR token
    const qrToken = crypto.randomBytes(32).toString('hex');

    const guest = await Guest.create({
      firstName,
      lastName,
      phone,
      email: email || null,
      idType: idType || null,
      idNumber: idNumber || null,
      nationality: nationality || null,
      address: address || null,
      dateOfBirth: dateOfBirth || null,
      qrToken,
      propertyId,
    });

    res.status(201).json({
      message: 'Registration successful',
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
        qrToken: guest.qrToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/guest-register/lookup/:token — Lookup guest by QR token (public, returns minimal info for verification)
router.get('/lookup/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.length !== 64) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    const guest = await Guest.findOne({
      where: { qrToken: token },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'idType', 'idNumber', 'nationality', 'address', 'dateOfBirth', 'propertyId', 'qrToken'],
    });

    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    res.json({ guest });
  } catch (error) {
    next(error);
  }
});

// ── Authenticated endpoint for staff ──

// GET /api/guest-register/scan/:token — Staff scans guest QR to pull up full details (authenticated)
router.get('/scan/:token', authenticate, tenantScope, async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.length !== 64) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    const guest = await Guest.findOne({
      where: { qrToken: token, propertyId: req.propertyId },
    });

    if (!guest) {
      return res.status(404).json({ error: 'Guest not found for this property' });
    }

    res.json({ guest });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
