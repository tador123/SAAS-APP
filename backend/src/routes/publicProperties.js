const router = require('express').Router();
const { Op } = require('sequelize');
const { Property, Room, MenuCategory, MenuItem, Reservation, RestaurantTable, TableReservation } = require('../models');

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
      attributes: ['id', 'timezone'],
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    const roomWhere = { propertyId: property.id, status: { [Op.notIn]: ['maintenance', 'cleaning'] } };

    // Determine date range: use provided dates or default to today (property timezone)
    const tz = property.timezone || 'UTC';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const rangeStart = checkIn || today;
    const rangeEnd = checkOut || '2099-12-31';

    // Exclude rooms with overlapping active reservations
    const overlapping = await Reservation.findAll({
      where: {
        propertyId: property.id,
        status: { [Op.notIn]: ['cancelled', 'no_show', 'checked_out'] },
        checkIn: { [Op.lt]: rangeEnd },
        checkOut: { [Op.gt]: rangeStart },
      },
      attributes: ['roomId'],
    });
    const excludeRoomIds = overlapping.map(r => r.roomId);

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

// GET /api/public/properties/:id/tables — Restaurant tables for a property
router.get('/properties/:id/tables', async (req, res, next) => {
  try {
    const { date } = req.query;

    const property = await Property.findOne({
      where: { id: req.params.id, isActive: true, approvalStatus: 'approved' },
      attributes: ['id', 'timezone'],
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    const tables = await RestaurantTable.findAll({
      where: { propertyId: property.id, status: { [Op.ne]: 'maintenance' } },
      attributes: ['id', 'tableNumber', 'capacity', 'status', 'location'],
      order: [['tableNumber', 'ASC']],
    });

    // Get reservations for the requested date (or today) to show booked time slots
    const tz = property.timezone || 'UTC';
    const checkDate = date || new Date().toLocaleDateString('en-CA', { timeZone: tz });

    const reservations = await TableReservation.findAll({
      where: {
        propertyId: property.id,
        reservationDate: checkDate,
        status: { [Op.notIn]: ['cancelled', 'no_show', 'completed'] },
      },
      attributes: ['tableId', 'reservationTime', 'partySize', 'status'],
    });

    // Group reserved time slots by table
    const reservedSlots = {};
    for (const r of reservations) {
      if (!reservedSlots[r.tableId]) reservedSlots[r.tableId] = [];
      reservedSlots[r.tableId].push({
        time: r.reservationTime.slice(0, 5),
        partySize: r.partySize,
        status: r.status,
      });
    }

    // Determine if checking today's date
    const isToday = checkDate === new Date().toLocaleDateString('en-CA', { timeZone: tz });

    const tablesWithSlots = tables.map(t => {
      const json = t.toJSON();
      const slots = reservedSlots[t.id] || [];
      json.reservedSlots = slots;

      // Mark if the table is currently occupied (has a confirmed or seated reservation today)
      if (t.status === 'occupied' || t.status === 'reserved') {
        json.currentlyOccupied = true;
      } else if (isToday && slots.some(s => s.status === 'confirmed' || s.status === 'seated')) {
        json.currentlyOccupied = true;
      } else {
        json.currentlyOccupied = false;
      }
      return json;
    });

    res.json({ tables: tablesWithSlots, date: checkDate });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
