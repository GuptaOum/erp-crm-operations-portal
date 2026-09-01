import { Router } from 'express';
import { prisma } from '../../lib/prisma';

export const healthRoutes = Router();

healthRoutes.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

healthRoutes.get('/ready', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ready' });
});
