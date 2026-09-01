import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { challanRoutes } from './modules/challans/challans.routes';
import { customerRoutes } from './modules/customers/customers.routes';
import { healthRoutes } from './modules/health/health.routes';
import { productRoutes } from './modules/products/products.routes';
import { stockRoutes } from './modules/stock/stock.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/stock-movements', stockRoutes);
  app.use('/api/challans', challanRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
