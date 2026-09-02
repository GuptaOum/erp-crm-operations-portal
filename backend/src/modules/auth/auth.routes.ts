import { NextFunction, Request, Response, Router } from 'express';
import rateLimit, { Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getClient } from '../../lib/redis';
import { authenticate } from '../../middleware/authenticate';
import * as controller from './auth.controller';

function loginStore(): Store | undefined {
  const redis = getClient();

  if (!redis) {
    return undefined;
  }

  return new RedisStore({
    prefix: 'login-limit:',
    sendCommand: (...args: string[]) => redis.call(...(args as [string, ...string[]])) as never,
  });
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: loginStore(),
});

let storeWarned = false;

function loginLimiter(req: Request, res: Response, next: NextFunction) {
  limiter(req, res, (error?: unknown) => {
    if (error) {
      if (!storeWarned) {
        storeWarned = true;
        console.warn('Login rate limit store unavailable, allowing the request', error);
      }
      return next();
    }

    next();
  });
}

export const authRoutes = Router();

authRoutes.post('/login', loginLimiter, controller.login);
authRoutes.get('/me', authenticate, controller.me);
