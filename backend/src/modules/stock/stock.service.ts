import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { buildMeta, getPageParams } from '../../utils/pagination';
import { ListMovementsInput } from './stock.schema';

export async function listMovements(query: ListMovementsInput) {
  const { page, limit, skip } = getPageParams(query.page, query.limit);
  const where: Prisma.StockMovementWhereInput = {};

  if (query.productId) {
    where.productId = query.productId;
  }

  if (query.type) {
    where.type = query.type;
  }

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
}
