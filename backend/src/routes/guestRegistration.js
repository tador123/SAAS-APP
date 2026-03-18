const router = require('express').Router();
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');
const { Guest, Property } = require('../models');
const { authenticate } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenantScope');

// ── Public endpoints (no auth — used by guests self-registering) ──

// POST /api/guest-register — Guest self-registration (public, property-agnostic)
// Creates a universal guest profile with a QR code that works at any property.
router.post('/', [
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
      propertyId: null,
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

// GET /api/guest-register/scan/:token — Staff scans guest QR to import guest into their property (authenticated)
// Looks up the guest globally by QR token, then copies/links the guest to the staff's property.
router.get('/scan/:token', authenticate, tenantScope, async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.length !== 64) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    // Find the guest by QR token (globally, not filtered by property)
    const sourceGuest = await Guest.findOne({
      where: { qrToken: token },
    });

    if (!sourceGuest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    // If this guest already belongs to the staff's property, return it directly
    if (sourceGuest.propertyId === req.propertyId) {
      return res.json({ guest: sourceGuest });
    }

    // Check if this guest was already imported into this property (by phone match)
    let localGuest = await Guest.findOne({
      where: { phone: sourceGuest.phone, propertyId: req.propertyId },
    });

    if (localGuest) {
      // Update the local record with latest details from the QR profile
      await localGuest.update({
        firstName: sourceGuest.firstName,
        lastName: sourceGuest.lastName,
        email: sourceGuest.email,
        idType: sourceGuest.idType,
        idNumber: sourceGuest.idNumber,
        nationality: sourceGuest.nationality,
        address: sourceGuest.address,
        dateOfBirth: sourceGuest.dateOfBirth,
      });
    } else {
      // Import: create a local copy for this property
      localGuest = await Guest.create({
        firstName: sourceGuest.firstName,
        lastName: sourceGuest.lastName,
        phone: sourceGuest.phone,
        email: sourceGuest.email,
        idType: sourceGuest.idType,
        idNumber: sourceGuest.idNumber,
        nationality: sourceGuest.nationality,
        address: sourceGuest.address,
        dateOfBirth: sourceGuest.dateOfBirth,
        propertyId: req.propertyId,
      });
    }

    res.json({ guest: localGuest });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
