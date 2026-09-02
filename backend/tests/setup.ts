import './env';
import { afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { closeCache } from '../src/lib/redis';

afterAll(async () => {
  await prisma.$disconnect();
  await closeCache();
});
