import { Role, User } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { api, bearer } from './helpers/api';
import { resetDatabase } from './helpers/database';
import { createCustomer, createProduct, createUsers } from './helpers/factories';

let users: Record<Role, User>;

async function summaryFor(role: Role) {
  const response = await api
    .get('/api/dashboard/summary')
    .set('Authorization', bearer(users[role]));

  expect(response.status).toBe(200);
  return response.body;
}

describe('dashboard summary', () => {
  beforeEach(async () => {
    await resetDatabase();
    users = await createUsers();

    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 2);

    await createCustomer(users.SALES.id, { status: 'ACTIVE', followUpDate: followUp });
    await createCustomer(users.SALES.id, { status: 'LEAD' });
    await createCustomer(users.SALES.id, { status: 'INACTIVE' });

    const product = await createProduct({ currentStock: 5, minStockAlert: 40 });
    await createProduct({ currentStock: 500, minStockAlert: 40 });

    await prisma.challan.create({
      data: {
        challanNumber: 'CH-2026-9101',
        customerId: (await prisma.customer.findFirstOrThrow()).id,
        createdById: users.SALES.id,
        status: 'CONFIRMED',
        totalQuantity: 1,
        totalAmount: product.unitPrice,
      },
    });
  });

  it('gives an admin every section', async () => {
    const summary = await summaryFor('ADMIN');

    expect(summary.totals).toMatchObject({
      totalProducts: 2,
      totalCustomers: 3,
      activeCustomers: 1,
      leads: 1,
      lowStockProducts: 1,
      draftChallans: 0,
      confirmedChallans: 1,
    });
    expect(summary.stockAlerts).toHaveLength(1);
    expect(summary.upcomingFollowUps).toHaveLength(1);
    expect(summary.recentChallans).toHaveLength(1);
  });

  it('never sends customer figures or follow ups to warehouse', async () => {
    const summary = await summaryFor('WAREHOUSE');

    expect(summary.totals).not.toHaveProperty('totalCustomers');
    expect(summary.totals).not.toHaveProperty('activeCustomers');
    expect(summary.totals).not.toHaveProperty('leads');
    expect(summary.totals.lowStockProducts).toBe(1);
    expect(summary.stockAlerts).toHaveLength(1);
    expect(summary.upcomingFollowUps).toEqual([]);
  });

  it('gives sales the customer and follow up sections but not the stock alerts', async () => {
    const summary = await summaryFor('SALES');

    expect(summary.totals.totalCustomers).toBe(3);
    expect(summary.totals).not.toHaveProperty('lowStockProducts');
    expect(summary.stockAlerts).toEqual([]);
    expect(summary.upcomingFollowUps).toHaveLength(1);
  });

  it('gives accounts the customer figures without stock alerts or follow ups', async () => {
    const summary = await summaryFor('ACCOUNTS');

    expect(summary.totals.totalCustomers).toBe(3);
    expect(summary.totals).not.toHaveProperty('lowStockProducts');
    expect(summary.stockAlerts).toEqual([]);
    expect(summary.upcomingFollowUps).toEqual([]);
  });

  it('shows the same challan counts to every role', async () => {
    const summaries = await Promise.all(
      (['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as Role[]).map(summaryFor),
    );

    for (const summary of summaries) {
      expect(summary.totals.confirmedChallans).toBe(1);
      expect(summary.totals.draftChallans).toBe(0);
      expect(summary.recentChallans).toHaveLength(1);
    }
  });
});
