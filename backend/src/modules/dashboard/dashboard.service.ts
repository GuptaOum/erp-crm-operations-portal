import { prisma } from '../../lib/prisma';

const lowStockWhere = { currentStock: { lte: prisma.product.fields.minStockAlert } };

export async function getSummary() {
  const followUpLimit = new Date();
  followUpLimit.setDate(followUpLimit.getDate() + 7);

  const [
    totalCustomers,
    activeCustomers,
    leads,
    totalProducts,
    lowStockProducts,
    draftChallans,
    confirmedChallans,
    recentChallans,
    stockAlerts,
    upcomingFollowUps,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { status: 'ACTIVE' } }),
    prisma.customer.count({ where: { status: 'LEAD' } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: lowStockWhere }),
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
    prisma.product.findMany({
      where: lowStockWhere,
      take: 5,
      orderBy: { currentStock: 'asc' },
      select: { id: true, name: true, sku: true, currentStock: true, minStockAlert: true },
    }),
    prisma.customer.findMany({
      where: { followUpDate: { not: null, lte: followUpLimit }, status: { not: 'INACTIVE' } },
      take: 5,
      orderBy: { followUpDate: 'asc' },
      select: { id: true, name: true, businessName: true, mobile: true, followUpDate: true },
    }),
  ]);

  return {
    totals: {
      totalCustomers,
      activeCustomers,
      leads,
      totalProducts,
      lowStockProducts,
      draftChallans,
      confirmedChallans,
    },
    recentChallans,
    stockAlerts,
    upcomingFollowUps,
  };
}
