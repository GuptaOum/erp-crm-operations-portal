import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { TokenPayload, verifyToken } from '../utils/token';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }

  let payload: TokenPayload;

  try {
    payload = verifyToken(header.slice(7));
  } catch {
    return next(new AppError(401, 'Invalid or expired token'));
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return next(new AppError(401, 'This account is no longer active'));
  }

  req.user = { id: user.id, email: user.email, role: user.role };
  next();
}

export function currentUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Authentication required');
  }
  return req.user;
}
