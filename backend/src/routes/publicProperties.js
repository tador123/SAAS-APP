const router = require('express').Router();
const { Op } = require('sequelize');
const { Property, Room, MenuCategory, MenuItem, Reservation } = require('../models');

// GET /api/public/properties — List all approved, active properties
router.get('/properties', async (req, res, next) => {
  try {
    const { search, type, city, country, minPrice, maxPrice, stars, page = 1, limit = 20 } = req.query;

    const where = {
      isActive: true,
      approvalStatus: 'approved',
    };

    if (type) where.type = type;
    if (city) where.city = { [Op.iLike]: `%${city}%` };
    if (country) where.country = country;
    if (stars) where.stars = parseInt(stars);

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));
    const parsedLimit = Math.min(50, parseInt(limit));

    const { count, rows } = await Property.findAndCountAll({
      where,
      attributes: ['id', 'name', 'slug', 'type', 'address', 'city', 'country', 'description', 'amenities', 'images', 'stars', 'currency', 'phone', 'email', 'website', 'latitude', 'longitude'],
      include: [{
        model: Room,
        as: 'rooms',
        attributes: ['id', 'price'],
        where: { status: 'available' },
        required: false,
      }],
      order: [['name', 'ASC']],
      limit: parsedLimit,
      offset,
      distinct: true,
    });

    // Add minPrice from rooms for each property
    const properties = rows.map(p => {
      const json = p.toJSON();
      const prices = (json.rooms || []).map(r => parseFloat(r.price)).filter(Boolean);
      json.startingPrice = prices.length > 0 ? Math.min(...prices) : null;
      json.totalRooms = (json.rooms || []).length;
      delete json.rooms;
      return json;
    });

    res.json({
      properties,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/public/properties/:id — Property detail with rooms and menu
router.get('/properties/:id', async (req, res, next) => {
  try {
    const property = await Property.findOne({
      where: {
        id: req.params.id,
        isActive: true,
        approvalStatus: 'approved',
      },
      attributes: ['id', 'name', 'slug', 'type', 'address', 'city', 'country', 'description', 'amenities', 'images', 'stars', 'currency', 'phone', 'email', 'website', 'timezone', 'latitude', 'longitude'],
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    res.json({ property });
  } catch (error) {
    next(error);
  }
});

// GET /api/public/properties/:id/rooms — Available rooms for a property
router.get('/properties/:id/rooms', async (req, res, next) => {
  try {
    const { checkIn, checkOut } = req.query;

    const property = await Property.findOne({
      where: { id: req.params.id, isActive: true, approvalStatus: 'approved' },
      attributes: ['id'],
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    const roomWhere = { propertyId: property.id };

    // If dates provided, exclude rooms with overlapping reservations
    let excludeRoomIds = [];
    if (checkIn && checkOut) {
      const overlapping = await Reservation.findAll({
        where: {
          propertyId: property.id,
          status: { [Op.notIn]: ['cancelled', 'no_show', 'checked_out'] },
          checkIn: { [Op.lt]: checkOut },
          checkOut: { [Op.gt]: checkIn },
        },
        attributes: ['roomId'],
      });
      excludeRoomIds = overlapping.map(r => r.roomId);
    }

    if (excludeRoomIds.length > 0) {
      roomWhere.id = { [Op.notIn]: excludeRoomIds };
    }

    const rooms = await Room.findAll({
      where: roomWhere,
      attributes: ['id', 'roomNumber', 'type', 'floor', 'price', 'amenities', 'description', 'maxOccupancy', 'images', 'status'],
      order: [['price', 'ASC']],
    });

    res.json({ rooms });
  } catch (error) {
    next(error);
  }
});

// GET /api/public/properties/:id/menu — Menu categories and items
router.get('/properties/:id/menu', async (req, res, next) => {
  try {
    const property = await Property.findOne({
      where: { id: req.params.id, isActive: true, approvalStatus: 'approved' },
      attributes: ['id'],
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    const categories = await MenuCategory.findAll({
      where: { propertyId: property.id, isActive: true },
      include: [{
        model: MenuItem,
        as: 'items',
        where: { isAvailable: true },
        required: false,
        attributes: ['id', 'name', 'description', 'price', 'image', 'isVegetarian', 'isVegan', 'allergens', 'preparationTime'],
      }],
      order: [['sortOrder', 'ASC'], [{ model: MenuItem, as: 'items' }, 'name', 'ASC']],
    });

    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
