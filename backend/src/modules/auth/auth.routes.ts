import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate';
import * as controller from './auth.controller';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRoutes = Router();

authRoutes.post('/login', loginLimiter, controller.login);
authRoutes.get('/me', authenticate, controller.me);
