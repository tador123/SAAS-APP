const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { Guest, GuestRefreshToken } = require('../models');
const { authenticateGuest } = require('../middleware/guestAuth');
const emailService = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';

function generateAccessToken(guest) {
  return jwt.sign({ id: guest.id, type: 'guest' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

async function generateRefreshToken(guestId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await GuestRefreshToken.create({ guestId, token, expiresAt });
  return token;
}

// POST /api/guest-auth/register
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name is required').escape(),
  body('lastName').trim().notEmpty().withMessage('Last name is required').escape(),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required').escape(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { firstName, lastName, email, phone, password } = req.body;

    // Check if email already exists
    const existing = await Guest.findOne({ where: { email }, paranoid: false });
    if (existing && existing.passwordHash) {
      return res.status(409).json({ error: 'An account with this email already exists. Please login.' });
    }

    const qrToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    let guest;
    if (existing) {
      // Upgrade existing guest record to a full account
      await existing.update({
        firstName,
        lastName,
        phone,
        passwordHash: await bcrypt.hash(password, 12),
        qrToken: existing.qrToken || qrToken,
        emailVerifyToken,
        emailVerifyExpires,
        emailVerified: false,
        deletedAt: null,
      });
      guest = existing;
    } else {
      guest = await Guest.create({
        firstName,
        lastName,
        email,
        phone,
        passwordHash: await bcrypt.hash(password, 12),
        qrToken,
        emailVerifyToken,
        emailVerifyExpires,
        propertyId: null,
      });
    }

    // Send verification email
    try {
      const verifyUrl = `${process.env.APP_URL || 'https://app.hotelware.in'}/api/guest-auth/verify-email?token=${emailVerifyToken}`;
      await emailService.send({
        to: email,
        subject: 'Verify your HotelSaaS account',
        html: `
          <h2>Welcome to HotelSaaS, ${firstName}!</h2>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563EB;color:white;text-decoration:none;border-radius:6px;">Verify Email</a>
          <p>Or use this code: <strong>${emailVerifyToken.substring(0, 6).toUpperCase()}</strong></p>
          <p>This link expires in 24 hours.</p>
        `,
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }

    const token = generateAccessToken(guest);
    const refreshToken = await generateRefreshToken(guest.id);

    res.status(201).json({
      message: 'Account created. Please verify your email.',
      token,
      refreshToken,
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
        qrToken: guest.qrToken,
        emailVerified: false,
        avatar: guest.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/guest-auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password } = req.body;

    const guest = await Guest.findOne({
      where: { email, propertyId: null },
    });

    if (!guest || !guest.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, guest.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateAccessToken(guest);
    const refreshToken = await generateRefreshToken(guest.id);

    res.json({
      token,
      refreshToken,
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
        qrToken: guest.qrToken,
        emailVerified: guest.emailVerified,
        avatar: guest.avatar,
        nationality: guest.nationality,
        dateOfBirth: guest.dateOfBirth,
        address: guest.address,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/guest-auth/verify-email?token=xxx
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const guest = await Guest.findOne({
      where: { emailVerifyToken: token },
    });

    if (!guest || !guest.emailVerifyExpires || guest.emailVerifyExpires < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    await guest.update({
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpires: null,
    });

    // If called from browser, show a success page
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.send('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h1>Email Verified!</h1><p>You can now use the HotelSaaS app.</p></body></html>');
    }

    res.json({ message: 'Email verified successfully.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/guest-auth/verify-code — verify with 6-char code
router.post('/verify-code', [
  body('code').trim().notEmpty(),
], authenticateGuest, async (req, res, next) => {
  try {
    const { code } = req.body;
    const guest = await Guest.findByPk(req.guest.id);

    if (!guest || !guest.emailVerifyToken) {
      return res.status(400).json({ error: 'No pending verification.' });
    }

    const expectedCode = guest.emailVerifyToken.substring(0, 6).toUpperCase();
    if (code.toUpperCase() !== expectedCode) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (guest.emailVerifyExpires < new Date()) {
      return res.status(400).json({ error: 'Verification code expired.' });
    }

    await guest.update({
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpires: null,
    });

    res.json({ message: 'Email verified successfully.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/guest-auth/refresh-token
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' });

    const stored = await GuestRefreshToken.findOne({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await stored.destroy();
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const guest = await Guest.findByPk(stored.guestId);
    if (!guest) {
      await stored.destroy();
      return res.status(401).json({ error: 'Guest not found.' });
    }

    // Rotate: destroy old, create new
    await stored.destroy();
    const newToken = generateAccessToken(guest);
    const newRefreshToken = await generateRefreshToken(guest.id);

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
});

// GET /api/guest-auth/profile
router.get('/profile', authenticateGuest, async (req, res) => {
  const guest = await Guest.findByPk(req.guest.id, {
    attributes: { exclude: ['passwordHash', 'emailVerifyToken', 'emailVerifyExpires'] },
  });
  res.json({ guest });
});

// PUT /api/guest-auth/profile
router.put('/profile', authenticateGuest, [
  body('firstName').optional().trim().notEmpty().escape(),
  body('lastName').optional().trim().notEmpty().escape(),
  body('phone').optional().trim().escape(),
  body('nationality').optional().trim().escape(),
  body('address').optional().trim().escape(),
  body('dateOfBirth').optional({ nullable: true }).isDate(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const allowed = ['firstName', 'lastName', 'phone', 'nationality', 'address', 'dateOfBirth'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const guest = await Guest.findByPk(req.guest.id);
    await guest.update(updates);

    res.json({
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
        qrToken: guest.qrToken,
        emailVerified: guest.emailVerified,
        avatar: guest.avatar,
        nationality: guest.nationality,
        dateOfBirth: guest.dateOfBirth,
        address: guest.address,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/guest-auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await GuestRefreshToken.destroy({ where: { token: refreshToken } });
    }
    res.json({ message: 'Logged out.' });
  } catch (error) {
    res.json({ message: 'Logged out.' });
  }
});

module.exports = router;
