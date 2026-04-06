import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth';
import { schoolRouter } from './routes/school';
import { busRouter } from './routes/bus';
import { driverRouter } from './routes/driver';
import { studentRouter } from './routes/student';
import { routeRouter } from './routes/route';
import { tripRouter } from './routes/trip';
import { attendanceRouter } from './routes/attendance';
import { alertRouter } from './routes/alert';
import { dashboardRouter } from './routes/dashboard';
import { parentRouter } from './routes/parent';
import { uploadRouter } from './routes/upload';
import { setupWebSocketHandlers } from './websocket';
import { errorHandler } from './middleware/error';
import { rateLimiter } from './middleware/rateLimit';
import { logger, requestLogger, Sentry } from './lib/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Request logging (must be before routes)
app.use(requestLogger);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);

// Health checks
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/schools', schoolRouter);
app.use('/api/buses', busRouter);
app.use('/api/drivers', driverRouter);
app.use('/api/students', studentRouter);
app.use('/api/routes', routeRouter);
app.use('/api/trips', tripRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/parents', parentRouter);
app.use('/api/uploads', uploadRouter);

// WebSocket setup
setupWebSocketHandlers(io);

// Error handling (Sentry first, then custom)
app.use(Sentry.Handlers.errorHandler());
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  logger.info(`SafeRoute API server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    redis: process.env.REDIS_URL ? 'connected' : 'fallback',
  });
  logger.info('WebSocket server ready for connections');
});

export { io };
export { logger };
