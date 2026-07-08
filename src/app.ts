import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { customersRouter } from './modules/customers/customers.routes.js';
import { conversationsRouter } from './modules/conversations/conversations.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { teamRouter } from './modules/team/team.routes.js';
import { businessesRouter } from './modules/businesses/businesses.routes.js';
import { crmOwnerRouter } from './modules/crm-owner/crm-owner.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { uploadsRouter, uploadsDir } from './modules/uploads/uploads.routes.js';

export function createApp(): express.Application {
  const app = express();

  // cross-origin resource policy lets the frontend (different origin) embed
  // uploaded product images served from /uploads.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(express.json({ limit: '1mb' }));

  // Serve device-uploaded product images.
  app.use('/uploads', express.static(uploadsDir));

  const corsOptions: cors.CorsOptions = {
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map((o) => o.trim()) : true,
    credentials: true,
  };
  app.use(cors(corsOptions));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/team', teamRouter);
  app.use('/api/businesses', businessesRouter);
  app.use('/api/crm-owner', crmOwnerRouter);

  app.use(errorHandler);
  return app;
}
