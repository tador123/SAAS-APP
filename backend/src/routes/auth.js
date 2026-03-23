const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, RefreshToken, AuditLog, PasswordReset, Property, sequelize } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { PLAN_LIMITS, getPlanLimits, getPropertyPlan, checkStaffLimit } = require('../middleware/subscription');
const emailService = require('../services/emailService');

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Set a refresh token in an httpOnly secure cookie.
 * Browser clients use the cookie automatically; mobile/API clients use the body value.
 */
function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction,                      // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    path: '/api/auth',                         // scoped to auth routes
    maxAge: 7 * 24 * 60 * 60 * 1000,          // 7 days
  });
}

/** Clear the refresh token cookie on logout. */
function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth',
  });
}

// POST /api/auth/signup — Public self-registration: creates a new property + admin account
router.post('/signup', [
  body('propertyName').trim().isLength({ min: 2, max: 100 }).withMessage('Property name must be 2-100 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),
  body('phone').optional().trim(),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('timezone').optional().trim(),
  body('country').optional().isLength({ min: 2, max: 2 }).withMessage('Country must be a 2-letter ISO code'),
], async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { propertyName, firstName, lastName, email, password, phone, currency, timezone, country } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email }, transaction: t });
    if (existingUser) {
      await t.rollback();
      return res.status(409).json({ error: 'Email already registered. Please login instead.' });
    }

    // Generate slug from property name
    const baseSlug = propertyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let suffix = 1;
    while (await Property.findOne({ where: { slug }, transaction: t })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    // Create property (auto-approved and active)
    const property = await Property.create({
      name: propertyName,
      slug,
      email,
      phone,
      currency: currency || 'USD',
      country: country || null,
      timezone: timezone || 'UTC',
      subscriptionPlan: 'free',
      isActive: true,
      approvalStatus: 'approved',
      approvedAt: new Date(),
    }, { transaction: t });

    // Create admin user for this property
    const user = await User.create({
      username: email.split('@')[0] + '-' + property.id,
      email,
      password,
      firstName,
      lastName,
      phone,
      role: 'admin',
      isActive: true,
      propertyId: property.id,
    }, { transaction: t });

    await t.commit();

    await AuditLog.log({
      userId: user.id,
      action: 'create',
      entityType: 'Property',
      entityId: property.id,
      changes: { via: 'self_signup', approvalStatus: 'approved' },
      req,
    });

    // Issue tokens immediately — property is auto-approved
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    const refreshToken = await RefreshToken.createForUser(user.id);
    setRefreshCookie(res, refreshToken.token);

    res.status(201).json({
      message: 'Account created successfully! Your property is now live.',
      token,
      refreshToken: refreshToken.token,
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        propertyId: property.id,
      },
      property: {
        id: property.id,
        name: property.name,
        currency: property.currency,
      },
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
});

// POST /api/auth/register (admin only — add staff to existing property)
router.post('/register', authenticate, authorize('admin'), checkStaffLimit, [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { username, email, password, firstName, lastName, phone } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // User model hooks handle hashing
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role: 'staff',
      phone,
      propertyId: req.user.propertyId,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
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

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Check property approval status (skip for system_admin who has no property)
    if (user.propertyId) {
      const userProperty = await Property.findByPk(user.propertyId);
      if (userProperty && userProperty.approvalStatus === 'pending') {
        return res.status(403).json({
          error: 'Your account is pending approval by the system administrator.',
          pendingApproval: true,
        });
      }
      if (userProperty && userProperty.approvalStatus === 'rejected') {
        return res.status(403).json({
          error: 'Your account registration has been rejected.',
          rejected: true,
          reason: userProperty.rejectionReason || undefined,
        });
      }
      if (userProperty && !userProperty.isActive) {
        return res.status(403).json({ error: 'Your property account is currently inactive.' });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await user.update({ lastLogin: new Date() });

    // Fetch property for currency info
    const property = await Property.findByPk(user.propertyId, {
      attributes: ['id', 'currency', 'country'],
    });

    // Short-lived access token (1 hour default)
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

    // Long-lived refresh token (7 days, stored in DB)
    const refreshToken = await RefreshToken.createForUser(user.id);
    setRefreshCookie(res, refreshToken.token);

    // Audit log
    await AuditLog.log({
      userId: user.id,
      action: 'login',
      entityType: 'User',
      entityId: user.id,
      req,
    });

    res.json({
      message: 'Login successful',
      token,
      refreshToken: refreshToken.token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        propertyId: user.propertyId,
        subscriptionPlan: user.subscriptionPlan,
        currency: property?.currency || 'USD',
        country: property?.country || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/refresh — Exchange refresh token for new access token
router.post('/refresh', [
  body('refreshToken').optional().notEmpty().withMessage('Refresh token is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    // Accept refresh token from cookie (browsers) or body (mobile/API clients)
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required (via cookie or body)' });
    }

    // Find valid refresh token
    const storedToken = await RefreshToken.findValid(refreshToken);
    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Get the user
    const user = await User.findByPk(storedToken.userId, {
      attributes: { exclude: ['password'] },
    });
    if (!user || !user.isActive) {
      await storedToken.update({ revokedAt: new Date() });
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    // Revoke old refresh token (rotation)
    await storedToken.update({ revokedAt: new Date() });

    // Issue new tokens
    const newAccessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const newRefreshToken = await RefreshToken.createForUser(user.id);
    setRefreshCookie(res, newRefreshToken.token);

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken.token,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout — Revoke a specific refresh token
router.post('/logout', authenticate, [
  body('refreshToken').optional().notEmpty(),
], async (req, res, next) => {
  try {
    // Accept from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      // Revoke specific token
      const storedToken = await RefreshToken.findValid(refreshToken);
      if (storedToken && storedToken.userId === req.user.id) {
        await storedToken.update({ revokedAt: new Date() });
      }
    }

    clearRefreshCookie(res);

    // Audit log
    await AuditLog.log({
      userId: req.user.id,
      action: 'logout',
      entityType: 'User',
      entityId: req.user.id,
      req,
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout-all — Revoke all refresh tokens for user (all devices)
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    await RefreshToken.revokeAllForUser(req.user.id);
    clearRefreshCookie(res);

    await AuditLog.log({
      userId: req.user.id,
      action: 'logout',
      entityType: 'User',
      entityId: req.user.id,
      changes: { scope: 'all_devices' },
      req,
    });

    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/profile — Update own profile
router.put('/profile', authenticate, [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const allowed = ['firstName', 'lastName', 'phone'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await User.findByPk(req.user.id);
    await user.update(updates);

    await AuditLog.log({
      userId: req.user.id,
      action: 'update',
      entityType: 'User',
      entityId: req.user.id,
      changes: updates,
      req,
    });

    res.json({
      message: 'Profile updated',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        subscriptionPlan: user.subscriptionPlan,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/change-password — Change own password
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await AuditLog.log({
      userId: req.user.id,
      action: 'update',
      entityType: 'User',
      entityId: req.user.id,
      changes: { field: 'password', via: 'change_password' },
      req,
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password — Request password reset email
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    // Always return 200 to prevent email enumeration
    const user = await User.findOne({ where: { email: req.body.email, isActive: true } });
    if (user) {
      const reset = await PasswordReset.createForUser(user.id);
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${reset.token}`;

      try {
        await emailService.sendPasswordReset({
          to: user.email,
          resetUrl,
          firstName: user.firstName,
        });
      } catch (emailErr) {
        require('../services/logger').error('Failed to send password reset email', { error: emailErr.message });
      }
    }

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password — Reset password with token
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { token, password } = req.body;
    const reset = await PasswordReset.findValid(token);
    if (!reset) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const user = await User.findByPk(reset.userId);
    if (!user || !user.isActive) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Update password (hooks will bcrypt it)
    user.password = password;
    await user.save();

    // Mark token as used
    await reset.update({ usedAt: new Date() });

    // Revoke all refresh tokens (force re-login on all devices)
    await RefreshToken.revokeAllForUser(user.id);

    await AuditLog.log({
      userId: user.id,
      action: 'update',
      entityType: 'User',
      entityId: user.id,
      changes: { field: 'password', via: 'reset_token' },
      req,
    });

    res.json({ message: 'Password reset successfully. Please login with your new password.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/subscription — Get current plan info with limits and usage
router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    const { Room, RestaurantTable } = require('../models');
    const { Op } = require('sequelize');
    const propertyPlan = await getPropertyPlan(req);
    const limits = getPlanLimits(propertyPlan);
    const propertyId = req.user.propertyId;

    // Count current usage scoped to property
    const countWhere = propertyId ? { propertyId } : {};
    const staffWhere = { role: { [Op.ne]: 'admin' }, isActive: true };
    if (propertyId) staffWhere.propertyId = propertyId;

    const [roomCount, tableCount, staffCount] = await Promise.all([
      Room.count({ where: countWhere }),
      RestaurantTable.count({ where: countWhere }),
      User.count({ where: staffWhere }),
    ]);

    res.json({
      currentPlan: propertyPlan,
      limits: {
        maxRooms: limits.maxRooms === Infinity ? 'unlimited' : limits.maxRooms,
        maxTables: limits.maxTables === Infinity ? 'unlimited' : limits.maxTables,
        maxStaff: limits.maxStaff === Infinity ? 'unlimited' : limits.maxStaff,
        invoices: limits.invoices,
        analytics: limits.analytics,
        apiAccess: limits.apiAccess,
        customBranding: limits.customBranding,
        multiProperty: limits.multiProperty,
      },
      usage: {
        rooms: roomCount,
        tables: tableCount,
        staff: staffCount,
      },
      allPlans: Object.entries(PLAN_LIMITS).map(([name, pl]) => ({
        name,
        maxRooms: pl.maxRooms === Infinity ? 'unlimited' : pl.maxRooms,
        maxTables: pl.maxTables === Infinity ? 'unlimited' : pl.maxTables,
        maxStaff: pl.maxStaff === Infinity ? 'unlimited' : pl.maxStaff,
        invoices: pl.invoices,
        analytics: pl.analytics,
        apiAccess: pl.apiAccess,
        customBranding: pl.customBranding,
        multiProperty: pl.multiProperty,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/subscription — Change subscription plan (admin only)
router.put('/subscription', authenticate, authorize('admin'), [
  body('plan').isIn(['free', 'basic', 'premium', 'enterprise']).withMessage('Invalid plan. Must be one of: free, basic, premium, enterprise'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { plan } = req.body;
    const propertyId = req.user.propertyId;

    if (!propertyId) {
      return res.status(400).json({ error: 'User is not assigned to a property.' });
    }

    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    const oldPlan = property.subscriptionPlan || 'free';

    if (oldPlan === plan) {
      return res.status(400).json({ error: `You are already on the "${plan}" plan.` });
    }

    await property.update({ subscriptionPlan: plan });

    await AuditLog.log({
      userId: req.user.id,
      action: 'update',
      entityType: 'Property',
      entityId: propertyId,
      changes: { subscriptionPlan: { from: oldPlan, to: plan } },
      req,
    });

    res.json({
      message: `Subscription changed from "${oldPlan}" to "${plan}" successfully`,
      property: {
        id: property.id,
        name: property.name,
        subscriptionPlan: plan,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
