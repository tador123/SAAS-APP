require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const routes = require('./routes');
const paymentRoutes = require('./routes/payments');
const errorHandler = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');
const seed = require('./seeders/seed');
const MigrationRunner = require('./config/migrationRunner');
const { setupSwagger } = require('./config/swagger');
const notificationScheduler = require('./services/notificationScheduler');
const websocketService = require('./services/websocketService');
const cacheService = require('./services/cacheService');
const logger = require('./services/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed for rate limiter behind nginx/load balancer)
app.set('trust proxy', process.env.TRUST_PROXY || 1);

// Middleware
app.use(requestId);   // assign unique request-id early
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:80', 'http://localhost:5173', 'http://localhost:8888'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(compression());
app.use(cookieParser());
// Structured logging with request-id
morgan.token('request-id', (req) => req.id);
const logFormat = process.env.NODE_ENV === 'production'
  ? ':request-id :remote-addr :method :url :status :res[content-length] - :response-time ms'
  : ':request-id :method :url :status :response-time ms';
app.use(morgan(logFormat));
// Stripe webhook needs raw body — must be before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/login', authLimiter);

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many password reset attempts, please try again later.' },
});
app.use('/api/auth/forgot-password', resetLimiter);
app.use('/api/auth/reset-password', resetLimiter);

// Health check (verifies DB connectivity)
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString(), db: 'disconnected' });
  }
});

// Swagger API docs
setupSwagger(app);

// Payment routes (Stripe) — separate from versioned API
app.use('/api/payments', paymentRoutes);

// API Routes — versioned
app.use('/api/v1', routes);
// Backward compatibility: /api/* → /api/v1/*
app.use('/api', routes);

// 404 catch-all for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Error handler
app.use(errorHandler);

// Database sync and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Connect to Redis cache (gracefully falls back to in-memory)
    await cacheService.connect();

    // Run database migrations (safe for production — only applies pending migrations)
    const migrationRunner = new MigrationRunner(sequelize);
    await migrationRunner.runPending();
    logger.info('Database migrations applied.');

    // In development, also sync model changes for convenience (non-destructive)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synced (dev mode).');
    }

    // Seed initial data (only in development or first run)
    if (process.env.NODE_ENV !== 'production' || process.env.SEED_DB === 'true') {
      await seed();
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Stripe payments: ${require('./services/stripeService').isConfigured() ? 'ENABLED' : 'DISABLED (manual plan switching only)'}`);
    });

    // Initialise WebSocket (Socket.io)
    websocketService.init(server, { corsOrigins: allowedOrigins });

    // Start notification scheduler (check-in reminders, overdue invoices)
    notificationScheduler.start();

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        try {
          notificationScheduler.stop();
          await cacheService.disconnect();
          await sequelize.close();
          logger.info('Database connection closed.');
        } catch (err) {
          logger.error('Error closing database:', err);
        }
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Catch unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', { reason: reason?.message || reason, stack: reason?.stack });
    });

    // Catch uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', { message: err.message, stack: err.stack });
      // Give logger time to flush, then exit
      setTimeout(() => process.exit(1), 1000);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
