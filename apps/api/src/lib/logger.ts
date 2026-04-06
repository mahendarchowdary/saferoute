import { createLogger, format, transports } from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import * as Sentry from '@sentry/node';

const { combine, timestamp, json, errors, printf, colorize } = format;

// Initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
  console.log('✅ Sentry initialized');
}

// Initialize Logtail if token is provided
let logtailTransport: LogtailTransport | null = null;
if (process.env.LOGTAIL_SOURCE_TOKEN) {
  const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);
  logtailTransport = new LogtailTransport(logtail);
  console.log('✅ Logtail initialized');
}

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  const serviceTag = service ? `[${service}]` : '[API]';
  const metaStr = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  return `${timestamp} ${serviceTag} ${level}: ${message} ${metaStr}`;
});

// Create logger instance
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'saferoute-api',
    environment: process.env.NODE_ENV || 'development',
  },
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // Console output (colored in dev, plain in production)
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
    }),
  ],
});

// Add Logtail transport if configured
if (logtailTransport) {
  logger.add(logtailTransport);
}

// Add file transports for production
if (process.env.NODE_ENV === 'production') {
  // Error log
  logger.add(new transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));

  // Combined log
  logger.add(new transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880,
    maxFiles: 5,
  }));
}

// Helper functions for structured logging
export const logInfo = (message: string, metadata?: Record<string, any>) => {
  logger.info(message, metadata);
};

export const logError = (message: string, error?: Error, metadata?: Record<string, any>) => {
  const errorData = error ? {
    error: error.message,
    stack: error.stack,
    name: error.name,
  } : {};

  logger.error(message, { ...metadata, ...errorData });

  // Send to Sentry
  if (process.env.SENTRY_DSN && error) {
    Sentry.captureException(error, {
      extra: metadata,
    });
  }
};

export const logWarn = (message: string, metadata?: Record<string, any>) => {
  logger.warn(message, metadata);
};

export const logDebug = (message: string, metadata?: Record<string, any>) => {
  logger.debug(message, metadata);
};

// Request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      schoolId: req.user?.schoolId,
    };

    if (res.statusCode >= 400) {
      logWarn('Request completed with error', logData);
    } else {
      logInfo('Request completed', logData);
    }
  });

  next();
};

// Error handling middleware with Sentry
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  const errorData = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params,
    userId: req.user?.id,
    schoolId: req.user?.schoolId,
  };

  logError('Unhandled error', err, errorData);

  // Sentry already captures in logError, but add request context
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setExtra('request', errorData);
      Sentry.captureException(err);
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    requestId: Sentry.getCurrentHub().getLastEventId(),
  });
};

export { Sentry };
