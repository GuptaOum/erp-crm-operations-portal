import { Role, User } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { api, bearer } from './helpers/api';
import { resetDatabase } from './helpers/database';
import {
  ALL_ROLES,
  createCustomer,
  createProduct,
  createUsers,
  customerPayload,
  productPayload,
} from './helpers/factories';

interface Fixtures {
  users: Record<Role, User>;
  customerId: string;
  productId: string;
  challanId: string;
}

interface RouteCase {
  name: string;
  method: 'get' | 'post' | 'patch';
  path: (fixtures: Fixtures) => string;
  body?: (fixtures: Fixtures) => Record<string, unknown>;
  allowed: Role[];
  success: number;
}

async function buildFixtures(): Promise<Fixtures> {
  const users = await createUsers();
  const customer = await createCustomer(users.SALES.id);
  const product = await createProduct({ currentStock: 100 });

  const challan = await prisma.challan.create({
    data: {
      challanNumber: 'CH-2026-9001',
      customerId: customer.id,
      createdById: users.SALES.id,
      totalQuantity: 5,
      totalAmount: product.unitPrice.mul(5),
      items: {
        create: [
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            unitPrice: product.unitPrice,
            quantity: 5,
            lineTotal: product.unitPrice.mul(5),
          },
        ],
      },
    },
  });

  return { users, customerId: customer.id, productId: product.id, challanId: challan.id };
}

const ROUTES: RouteCase[] = [
  {
    name: 'GET /api/users',
    method: 'get',
    path: () => '/api/users',
    allowed: ['ADMIN'],
    success: 200,
  },
  {
    name: 'POST /api/users',
    method: 'post',
    path: () => '/api/users',
    body: () => ({
      name: 'Prakash Shinde',
      email: 'prakash@example.com',
      role: 'SALES',
      password: 'Portal@2026',
    }),
    allowed: ['ADMIN'],
    success: 201,
  },
  {
    name: 'PATCH /api/users/:id',
    method: 'patch',
    path: (f) => `/api/users/${f.users.WAREHOUSE.id}`,
    body: () => ({ name: 'Sagar P' }),
    allowed: ['ADMIN'],
    success: 200,
  },
  {
    name: 'POST /api/users/:id/password',
    method: 'post',
    path: (f) => `/api/users/${f.users.WAREHOUSE.id}/password`,
    body: () => ({ password: 'NewPortal@2027' }),
    allowed: ['ADMIN'],
    success: 200,
  },
  {
    name: 'GET /api/customers',
    method: 'get',
    path: () => '/api/customers',
    allowed: ['ADMIN', 'SALES', 'ACCOUNTS'],
    success: 200,
  },
  {
    name: 'GET /api/customers/:id',
    method: 'get',
    path: (f) => `/api/customers/${f.customerId}`,
    allowed: ['ADMIN', 'SALES', 'ACCOUNTS'],
    success: 200,
  },
  {
    name: 'GET /api/customers/:id/notes',
    method: 'get',
    path: (f) => `/api/customers/${f.customerId}/notes`,
    allowed: ['ADMIN', 'SALES', 'ACCOUNTS'],
    success: 200,
  },
  {
    name: 'POST /api/customers',
    method: 'post',
    path: () => '/api/customers',
    body: () => customerPayload(),
    allowed: ['ADMIN', 'SALES'],
    success: 201,
  },
  {
    name: 'PATCH /api/customers/:id',
    method: 'patch',
    path: (f) => `/api/customers/${f.customerId}`,
    body: () => ({ city: 'Nashik' }),
    allowed: ['ADMIN', 'SALES'],
    success: 200,
  },
  {
    name: 'POST /api/customers/:id/notes',
    method: 'post',
    path: (f) => `/api/customers/${f.customerId}/notes`,
    body: () => ({ note: 'Called about the pending quotation.' }),
    allowed: ['ADMIN', 'SALES'],
    success: 201,
  },
  {
    name: 'GET /api/stock-movements',
    method: 'get',
    path: () => '/api/stock-movements',
    allowed: ['ADMIN', 'WAREHOUSE'],
    success: 200,
  },
  {
    name: 'GET /api/products',
    method: 'get',
    path: () => '/api/products',
    allowed: ALL_ROLES,
    success: 200,
  },
  {
    name: 'GET /api/products/:id',
    method: 'get',
    path: (f) => `/api/products/${f.productId}`,
    allowed: ALL_ROLES,
    success: 200,
  },
  {
    name: 'POST /api/products',
    method: 'post',
    path: () => '/api/products',
    body: () => productPayload(),
    allowed: ['ADMIN', 'WAREHOUSE'],
    success: 201,
  },
  {
    name: 'PATCH /api/products/:id',
    method: 'patch',
    path: (f) => `/api/products/${f.productId}`,
    body: () => ({ location: 'Rack Z9' }),
    allowed: ['ADMIN', 'WAREHOUSE'],
    success: 200,
  },
  {
    name: 'POST /api/products/:id/stock',
    method: 'post',
    path: (f) => `/api/products/${f.productId}/stock`,
    body: () => ({ quantity: 5, type: 'IN', reason: 'Stock correction' }),
    allowed: ['ADMIN', 'WAREHOUSE'],
    success: 200,
  },
  {
    name: 'GET /api/challans',
    method: 'get',
    path: () => '/api/challans',
    allowed: ALL_ROLES,
    success: 200,
  },
  {
    name: 'GET /api/challans/:id',
    method: 'get',
    path: (f) => `/api/challans/${f.challanId}`,
    allowed: ALL_ROLES,
    success: 200,
  },
  {
    name: 'GET /api/challans/:id/pdf',
    method: 'get',
    path: (f) => `/api/challans/${f.challanId}/pdf`,
    allowed: ['ADMIN', 'SALES', 'ACCOUNTS'],
    success: 200,
  },
  {
    name: 'POST /api/challans',
    method: 'post',
    path: () => '/api/challans',
    body: (f) => ({ customerId: f.customerId, items: [{ productId: f.productId, quantity: 2 }] }),
    allowed: ['ADMIN', 'SALES'],
    success: 201,
  },
  {
    name: 'POST /api/challans/:id/confirm',
    method: 'post',
    path: (f) => `/api/challans/${f.challanId}/confirm`,
    allowed: ['ADMIN', 'SALES', 'WAREHOUSE'],
    success: 200,
  },
  {
    name: 'POST /api/challans/:id/cancel',
    method: 'post',
    path: (f) => `/api/challans/${f.challanId}/cancel`,
    allowed: ['ADMIN', 'SALES'],
    success: 200,
  },
  {
    name: 'GET /api/dashboard/summary',
    method: 'get',
    path: () => '/api/dashboard/summary',
    allowed: ALL_ROLES,
    success: 200,
  },
];

function send(route: RouteCase, fixtures: Fixtures, authorization?: string) {
  const request = api[route.method](route.path(fixtures));

  if (authorization) {
    request.set('Authorization', authorization);
  }

  return route.body ? request.send(route.body(fixtures)) : request;
}

describe('role based access control', () => {
  let fixtures: Fixtures;

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await buildFixtures();
  });

  for (const route of ROUTES) {
    for (const role of ALL_ROLES) {
      const permitted = route.allowed.includes(role);

      it(`${permitted ? 'allows' : 'denies'} ${role} on ${route.name}`, async () => {
        const response = await send(route, fixtures, bearer(fixtures.users[role]));

        if (permitted) {
          expect(response.status).toBe(route.success);
        } else {
          expect(response.status).toBe(403);
          expect(response.body.error.message).toBe(
            'You do not have permission to perform this action',
          );
        }
      });
    }

    it(`refuses ${route.name} without a token`, async () => {
      const response = await send(route, fixtures);

      expect(response.status).toBe(401);
    });
  }

  it('never returns customer contact details to warehouse through the challan detail route', async () => {
    const response = await api
      .get(`/api/challans/${fixtures.challanId}`)
      .set('Authorization', bearer(fixtures.users.WAREHOUSE));

    expect(response.status).toBe(200);
    expect(response.body.customer.gstNumber).toBeNull();
    expect(response.body.customer.addressLine).toBe('Shop 14, Laxmi Road');
    expect(response.body.customer.city).toBe('Pune');
    expect(response.body.customer.pincode).toBe('411030');
  });

  it('returns full customer details on a challan to the commercial roles', async () => {
    for (const role of ['ADMIN', 'SALES', 'ACCOUNTS'] as Role[]) {
      const response = await api
        .get(`/api/challans/${fixtures.challanId}`)
        .set('Authorization', bearer(fixtures.users[role]));

      expect(response.status).toBe(200);
      expect(response.body.customer.gstNumber).toBe('27AAECS1234F1Z5');
    }
  });

  it('masks the gst number for warehouse in the challan list as well', async () => {
    const response = await api
      .get('/api/challans')
      .set('Authorization', bearer(fixtures.users.WAREHOUSE));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].customer.gstNumber).toBeNull();
  });

  it('returns 404 rather than a permission error for an unknown route', async () => {
    const response = await api
      .get('/api/nothing-here')
      .set('Authorization', bearer(fixtures.users.ADMIN));

    expect(response.status).toBe(404);
  });
});
