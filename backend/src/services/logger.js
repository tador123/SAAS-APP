/**
 * Winston Logger — structured logging for production.
 *
 * - JSON logs in production → pipe to ELK, Datadog, CloudWatch, etc.
 * - Colorised console logs in development
 * - Daily rotated log files in production (14-day retention, 20MB max per file)
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

const isProduction = process.env.NODE_ENV === 'production';
const logsDir = path.join(__dirname, '../../logs');

const logger = createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  defaultMeta: { service: 'hotel-restaurant-api' },
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    isProduction
      ? format.json()
      : format.combine(format.colorize(), format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })),
  ),
  transports: [
    new transports.Console(),
    // Production: daily rotated log files
    ...(isProduction
      ? [
          new transports.DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true,
          }),
          new transports.DailyRotateFile({
            filename: path.join(logsDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true,
          }),
        ]
      : []),
  ],
  // Don't exit on uncaught exceptions — let process handler deal with it
  exitOnError: false,
});

module.exports = logger;
