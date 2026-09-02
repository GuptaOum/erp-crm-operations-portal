import { prisma } from '../../src/lib/prisma';
import { cacheFlush } from '../../src/lib/redis';

const TABLES = [
  'challan_items',
  'challans',
  'stock_movements',
  'customer_notes',
  'customers',
  'products',
  'document_sequences',
  'users',
];

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );

  await cacheFlush();
}
