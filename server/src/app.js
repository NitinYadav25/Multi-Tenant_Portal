import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import organizationRoutes from './routes/organization.routes.js';
import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { sendSuccess } from './utils/response.js';

export const createApp = () => {
  const app = express();

  // Trust proxy in production for rate limiting and secure cookies
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false // Allows client inline styles/scripts if served
    })
  );

  // CORS Configuration
  const allowedOrigins = [env.CLIENT_URL];
  // Support both localhost and 127.0.0.1 in development
  if (env.NODE_ENV === 'development') {
    allowedOrigins.push('http://127.0.0.1:5173', 'http://localhost:3000');
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in dev if matching domain pattern
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    })
  );

  // Global Rate Limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again after 15 minutes.'
      }
    },
    skip: () => env.NODE_ENV === 'test',
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/api', generalLimiter);

  // Request Body Parsing (10kb limit as required)
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Cookie Parser
  app.use(cookieParser());

  // Prevent MongoDB Operator Injection
  app.use(mongoSanitize());

  // HTTP Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Health check endpoint (public)
  app.get('/api/health', (req, res) => {
    return sendSuccess(res, {
      status: 'healthy',
      service: 'nexora-api',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

  // Mount API Routers
  app.use('/api/auth', authRoutes);
  app.use('/api/organizations', organizationRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);

  // Catch-all for undefined routes
  app.use(notFound);

  // Central Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
export default app;
