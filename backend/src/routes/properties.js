const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Property, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

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
