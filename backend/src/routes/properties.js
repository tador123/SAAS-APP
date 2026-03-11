const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Property, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

// ─── Branding endpoints (property-scoped) ─────────────────────────

// GET /api/properties/branding — Get branding for the current user's property
router.get('/branding', authenticate, async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.user.propertyId);
    if (!property) return res.status(404).json({ error: 'Property not found.' });

    const settings = property.settings || {};
    res.json({
      propertyId: property.id,
      propertyName: property.name,
      brandName: settings.brandName || property.name,
      tagline: settings.tagline || '',
      logoUrl: settings.logoUrl || '',
      faviconUrl: settings.faviconUrl || '',
      primaryColor: settings.primaryColor || '#2563eb',
      accentColor: settings.accentColor || '#d4a843',
      sidebarColor: settings.sidebarColor || '#1a1f2e',
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/properties/branding — Update branding for the current user's property
router.put('/branding', authenticate, authorize('admin', 'manager'), [
  body('brandName').optional().trim().isLength({ min: 1, max: 100 }),
  body('tagline').optional().trim().isLength({ max: 200 }),
  body('logoUrl').optional().trim(),
  body('faviconUrl').optional().trim(),
  body('primaryColor').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Must be a valid hex color'),
  body('accentColor').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Must be a valid hex color'),
  body('sidebarColor').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Must be a valid hex color'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const property = await Property.findByPk(req.user.propertyId);
    if (!property) return res.status(404).json({ error: 'Property not found.' });

    const { brandName, tagline, logoUrl, faviconUrl, primaryColor, accentColor, sidebarColor } = req.body;
    const currentSettings = property.settings || {};

    const updatedSettings = {
      ...currentSettings,
      ...(brandName !== undefined && { brandName }),
      ...(tagline !== undefined && { tagline }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(faviconUrl !== undefined && { faviconUrl }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(accentColor !== undefined && { accentColor }),
      ...(sidebarColor !== undefined && { sidebarColor }),
    };

    // Also update property name if brandName provided
    const updates = { settings: updatedSettings };
    if (brandName) updates.name = brandName;

    await property.update(updates);

    res.json({
      message: 'Branding updated successfully',
      propertyId: property.id,
      propertyName: property.name,
      brandName: updatedSettings.brandName || property.name,
      tagline: updatedSettings.tagline || '',
      logoUrl: updatedSettings.logoUrl || '',
      faviconUrl: updatedSettings.faviconUrl || '',
      primaryColor: updatedSettings.primaryColor || '#2563eb',
      accentColor: updatedSettings.accentColor || '#d4a843',
      sidebarColor: updatedSettings.sidebarColor || '#1a1f2e',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/properties/desktop-download — Get download links for desktop app
router.get('/desktop-download', authenticate, async (req, res) => {
  // Return download links for all platforms
  const baseUrl = 'https://github.com/tador123/SAAS-APP/releases/latest/download';
  res.json({
    platforms: {
      windows: {
        name: 'Windows',
        ext: '.msi',
        url: `${baseUrl}/HotelSaaS-Desktop_1.0.0_x64_en-US.msi`,
        size: '~25 MB',
      },
      mac: {
        name: 'macOS',
        ext: '.dmg',
        url: `${baseUrl}/HotelSaaS-Desktop_1.0.0_x64.dmg`,
        size: '~30 MB',
      },
      linux: {
        name: 'Linux',
        ext: '.AppImage',
        url: `${baseUrl}/HotelSaaS-Desktop_1.0.0_amd64.AppImage`,
        size: '~25 MB',
      },
    },
    version: '1.0.0',
    releaseNotes: 'Initial release with offline mode, system tray, and native printing support.',
  });
});

// ─── CRUD endpoints ───────────────────────────────────────────────

// GET /api/properties — List all properties (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const properties = await Property.findAll({
      include: [{ model: User, as: 'users', attributes: ['id', 'firstName', 'lastName', 'role'] }],
      order: [['name', 'ASC']],
    });
    res.json(properties);
  } catch (error) {
    next(error);
  }
});

// GET /api/properties/:id — Get single property
router.get('/:id', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [{ model: User, as: 'users', attributes: ['id', 'firstName', 'lastName', 'role', 'email'] }],
    });
    if (!property) return res.status(404).json({ error: 'Property not found.' });
    res.json(property);
  } catch (error) {
    next(error);
  }
});

// POST /api/properties — Create a property (admin only)
router.post('/', authenticate, authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Property name is required'),
  body('slug').trim().isSlug().withMessage('Valid slug is required'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('timezone').optional().trim(),
  body('currency').optional().isLength({ min: 3, max: 3 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { name, slug, address, phone, email, timezone, currency, settings } = req.body;
    const property = await Property.create({ name, slug, address, phone, email, timezone, currency, settings });
    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
});

// PUT /api/properties/:id — Update a property
router.put('/:id', authenticate, authorize('admin'), [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
], async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found.' });

    const { name, slug, address, phone, email, timezone, currency, settings, isActive } = req.body;
    await property.update({ name, slug, address, phone, email, timezone, currency, settings, isActive });
    res.json(property);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/properties/:id — Soft-delete a property (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found.' });
    await property.destroy(); // soft-delete (paranoid)
    res.json({ message: 'Property deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
