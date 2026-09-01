import supertest from 'supertest';
import { User } from '@prisma/client';
import { createApp } from '../../src/app';
import { signToken } from '../../src/utils/token';

const app = createApp();

export const api = supertest(app);

export function bearer(user: User) {
  return `Bearer ${signToken({ sub: user.id, email: user.email, role: user.role })}`;
}
