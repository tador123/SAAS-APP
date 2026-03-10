const { Sequelize } = require('sequelize');

// In production, all DB credentials must be explicitly provided via env vars
if (process.env.NODE_ENV === 'production') {
  const required = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`FATAL: Missing required database environment variables: ${missing.join(', ')}`);
  }
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'hotelrestaurant',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? undefined : 'postgres123'),
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'production' ? false : (msg) => require('../services/logger').debug(msg),
    // SSL for managed PostgreSQL (AWS RDS, Azure, etc.)
    ...(process.env.DB_SSL === 'true' && {
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        },
      },
    }),
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 0,
      acquire: 30000,
      idle: 10000,
    },
    retry: {
      max: 5,
    },
  }
);

module.exports = sequelize;
