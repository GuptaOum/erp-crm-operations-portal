import { Router } from 'express';
import { authenticate, currentUser } from '../../middleware/authenticate';
import * as dashboardService from './dashboard.service';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate);

dashboardRoutes.get('/summary', async (req, res) => {
  const summary = await dashboardService.getSummary(currentUser(req).role);
  res.json(summary);
});
