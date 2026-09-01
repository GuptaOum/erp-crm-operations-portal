import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const lowStockWhere = { currentStock: { lte: prisma.product.fields.minStockAlert } };

const CUSTOMER_ROLES: Role[] = ['ADMIN', 'SALES', 'ACCOUNTS'];
const STOCK_ROLES: Role[] = ['ADMIN', 'WAREHOUSE'];
const FOLLOW_UP_ROLES: Role[] = ['ADMIN', 'SALES'];

export async function getSummary(role: Role) {
  const seesCustomers = CUSTOMER_ROLES.includes(role);
  const seesStock = STOCK_ROLES.includes(role);
  const seesFollowUps = FOLLOW_UP_ROLES.includes(role);

  const followUpLimit = new Date();
  followUpLimit.setDate(followUpLimit.getDate() + 7);

  const [totalProducts, draftChallans, confirmedChallans, recentChallans] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.challan.count({ where: { status: 'DRAFT' } }),
    prisma.challan.count({ where: { status: 'CONFIRMED' } }),
    prisma.challan.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        challanNumber: true,
        status: true,
        totalQuantity: true,
        createdAt: true,
        customer: { select: { businessName: true } },
      },
    }),
  ]);

  const totals: Record<string, number> = { totalProducts, draftChallans, confirmedChallans };

  if (seesCustomers) {
    const [totalCustomers, activeCustomers, leads] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.customer.count({ where: { status: 'LEAD' } }),
    ]);

    totals.totalCustomers = totalCustomers;
    totals.activeCustomers = activeCustomers;
    totals.leads = leads;
  }

  if (seesStock) {
    totals.lowStockProducts = await prisma.product.count({ where: lowStockWhere });
  }

  const stockAlerts = seesStock
    ? await prisma.product.findMany({
        where: lowStockWhere,
        take: 5,
        orderBy: { currentStock: 'asc' },
        select: { id: true, name: true, sku: true, currentStock: true, minStockAlert: true },
      })
    : [];

  const upcomingFollowUps = seesFollowUps
    ? await prisma.customer.findMany({
        where: { followUpDate: { not: null, lte: followUpLimit }, status: { not: 'INACTIVE' } },
        take: 5,
        orderBy: { followUpDate: 'asc' },
        select: { id: true, name: true, businessName: true, mobile: true, followUpDate: true },
      })
    : [];

  return { totals, recentChallans, stockAlerts, upcomingFollowUps };
}
