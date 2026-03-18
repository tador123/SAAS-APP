const jwt = require('jsonwebtoken');
const { Guest } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Authenticate a guest user via JWT.
 * Guest tokens have { id, type: 'guest' } in the payload.
 */
const authenticateGuest = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'guest') {
      return res.status(401).json({ error: 'Invalid token type.' });
    }

    const guest = await Guest.findByPk(decoded.id, {
      attributes: { exclude: ['passwordHash', 'emailVerifyToken', 'emailVerifyExpires'] },
    });

    if (!guest) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    req.guest = guest;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = { authenticateGuest };
