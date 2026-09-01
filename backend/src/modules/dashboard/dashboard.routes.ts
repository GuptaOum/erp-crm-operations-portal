import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as dashboardService from './dashboard.service';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate);

dashboardRoutes.get('/summary', async (_req, res) => {
  const summary = await dashboardService.getSummary();
  res.json(summary);
});
