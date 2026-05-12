import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  const corsOptions: cors.CorsOptions = {
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map((o) => o.trim()) : true,
    credentials: true,
  };
  app.use(cors(corsOptions));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);

  app.use(errorHandler);
  return app;
}
