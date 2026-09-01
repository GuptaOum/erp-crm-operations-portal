import { Role, User } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { api, bearer } from './helpers/api';
import { resetDatabase } from './helpers/database';
import { createCustomer, createProduct, createUsers, stockOf } from './helpers/factories';

let users: Record<Role, User>;
let customerId: string;

async function seed() {
  await resetDatabase();
  users = await createUsers();
  customerId = (await createCustomer(users.SALES.id)).id;
}

function asSales() {
  return bearer(users.SALES);
}

describe('sales challans', () => {
  beforeEach(seed);

  it('creates a draft without touching stock', async () => {
    const product = await createProduct({ currentStock: 40 });

    const response = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, items: [{ productId: product.id, quantity: 10 }] });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('DRAFT');
    expect(response.body.totalQuantity).toBe(10);
    expect(await stockOf(product.id)).toBe(40);
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it('prices the lines from the product record rather than the request', async () => {
    const product = await createProduct({ currentStock: 40, unitPrice: 250 });

    const response = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({
        customerId,
        items: [{ productId: product.id, quantity: 4, unitPrice: 1, lineTotal: 1 }],
      });

    expect(response.status).toBe(201);
    expect(response.body.items[0].unitPrice).toBe(250);
    expect(response.body.items[0].lineTotal).toBe(1000);
    expect(response.body.totalAmount).toBe(1000);
  });

  it('merges repeated lines for the same product', async () => {
    const product = await createProduct({ currentStock: 40 });

    const response = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({
        customerId,
        items: [
          { productId: product.id, quantity: 3 },
          { productId: product.id, quantity: 7 },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(10);
    expect(response.body.totalQuantity).toBe(10);
  });

  it('deducts stock and records an outward movement when a draft is confirmed', async () => {
    const product = await createProduct({ currentStock: 40 });

    const created = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, items: [{ productId: product.id, quantity: 12 }] });

    const response = await api
      .post(`/api/challans/${created.body.id}/confirm`)
      .set('Authorization', asSales());

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('CONFIRMED');
    expect(response.body.confirmedAt).not.toBeNull();
    expect(await stockOf(product.id)).toBe(28);

    const movements = await prisma.stockMovement.findMany();
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      productId: product.id,
      quantity: 12,
      type: 'OUT',
      referenceType: 'CHALLAN',
      referenceId: created.body.id,
      createdById: users.SALES.id,
    });
  });

  it('creates and confirms in a single call when confirm is set', async () => {
    const product = await createProduct({ currentStock: 40 });

    const response = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, confirm: true, items: [{ productId: product.id, quantity: 15 }] });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('CONFIRMED');
    expect(await stockOf(product.id)).toBe(25);
    expect(await prisma.stockMovement.count()).toBe(1);
  });

  it('refuses to confirm beyond available stock and leaves every product untouched', async () => {
    const plentiful = await createProduct({ currentStock: 500 });
    const scarce = await createProduct({ currentStock: 3 });

    const created = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({
        customerId,
        items: [
          { productId: plentiful.id, quantity: 10 },
          { productId: scarce.id, quantity: 4 },
        ],
      });

    const response = await api
      .post(`/api/challans/${created.body.id}/confirm`)
      .set('Authorization', asSales());

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Insufficient stock');
    expect(await stockOf(plentiful.id)).toBe(500);
    expect(await stockOf(scarce.id)).toBe(3);
    expect(await prisma.stockMovement.count()).toBe(0);

    const challan = await prisma.challan.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(challan.status).toBe('DRAFT');
    expect(challan.confirmedAt).toBeNull();
  });

  it('rolls the whole challan back when create and confirm cannot be satisfied', async () => {
    const product = await createProduct({ currentStock: 2 });

    const response = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, confirm: true, items: [{ productId: product.id, quantity: 5 }] });

    expect(response.status).toBe(400);
    expect(await prisma.challan.count()).toBe(0);
    expect(await prisma.challanItem.count()).toBe(0);
    expect(await prisma.stockMovement.count()).toBe(0);
    expect(await prisma.documentSequence.count()).toBe(0);
    expect(await stockOf(product.id)).toBe(2);
  });

  it('refuses to confirm a challan twice', async () => {
    const product = await createProduct({ currentStock: 40 });

    const created = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, confirm: true, items: [{ productId: product.id, quantity: 5 }] });

    const response = await api
      .post(`/api/challans/${created.body.id}/confirm`)
      .set('Authorization', asSales());

    expect(response.status).toBe(409);
    expect(await stockOf(product.id)).toBe(35);
    expect(await prisma.stockMovement.count()).toBe(1);
  });

  it('returns the stock when a confirmed challan is cancelled', async () => {
    const product = await createProduct({ currentStock: 40 });

    const created = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, confirm: true, items: [{ productId: product.id, quantity: 12 }] });

    const response = await api
      .post(`/api/challans/${created.body.id}/cancel`)
      .set('Authorization', asSales());

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('CANCELLED');
    expect(await stockOf(product.id)).toBe(40);

    const movements = await prisma.stockMovement.findMany({ orderBy: { type: 'asc' } });
    expect(movements.map((movement) => movement.type)).toEqual(['IN', 'OUT']);
  });

  it('cancels a draft without creating a compensating movement', async () => {
    const product = await createProduct({ currentStock: 40 });

    const created = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, items: [{ productId: product.id, quantity: 12 }] });

    const response = await api
      .post(`/api/challans/${created.body.id}/cancel`)
      .set('Authorization', asSales());

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('CANCELLED');
    expect(await stockOf(product.id)).toBe(40);
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it('refuses to cancel a challan twice', async () => {
    const product = await createProduct({ currentStock: 40 });

    const created = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, items: [{ productId: product.id, quantity: 5 }] });

    await api.post(`/api/challans/${created.body.id}/cancel`).set('Authorization', asSales());

    const response = await api
      .post(`/api/challans/${created.body.id}/cancel`)
      .set('Authorization', asSales());

    expect(response.status).toBe(409);
  });

  it('refuses to confirm a cancelled challan', async () => {
    const product = await createProduct({ currentStock: 40 });

    const created = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, items: [{ productId: product.id, quantity: 5 }] });

    await api.post(`/api/challans/${created.body.id}/cancel`).set('Authorization', asSales());

    const response = await api
      .post(`/api/challans/${created.body.id}/confirm`)
      .set('Authorization', asSales());

    expect(response.status).toBe(409);
    expect(await stockOf(product.id)).toBe(40);
  });

  it('numbers challans sequentially within the year', async () => {
    const product = await createProduct({ currentStock: 100 });
    const year = new Date().getFullYear();

    const first = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, items: [{ productId: product.id, quantity: 1 }] });

    const second = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, items: [{ productId: product.id, quantity: 1 }] });

    expect(first.body.challanNumber).toBe(`CH-${year}-0001`);
    expect(second.body.challanNumber).toBe(`CH-${year}-0002`);
  });

  it('rejects an unknown customer', async () => {
    const product = await createProduct();

    const response = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({
        customerId: '00000000-0000-4000-8000-000000000000',
        items: [{ productId: product.id, quantity: 1 }],
      });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Customer not found');
  });

  it('rejects an unknown product', async () => {
    const response = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({
        customerId,
        items: [{ productId: '00000000-0000-4000-8000-000000000000', quantity: 1 }],
      });

    expect(response.status).toBe(404);
    expect(await prisma.challan.count()).toBe(0);
  });

  it('rejects a challan with no lines', async () => {
    const response = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, items: [] });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
  });

  it('rejects a non positive quantity', async () => {
    const product = await createProduct();

    const response = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, items: [{ productId: product.id, quantity: 0 }] });

    expect(response.status).toBe(400);
  });

  it('returns 404 for a challan that does not exist', async () => {
    const response = await api
      .get('/api/challans/00000000-0000-4000-8000-000000000000')
      .set('Authorization', asSales());

    expect(response.status).toBe(404);
  });

  it('returns 400 for an identifier that is not a uuid', async () => {
    const response = await api.get('/api/challans/not-a-uuid').set('Authorization', asSales());

    expect(response.status).toBe(400);
  });

  it('filters the list by status and customer', async () => {
    const product = await createProduct({ currentStock: 100 });
    const other = await createCustomer(users.SALES.id);

    await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, confirm: true, items: [{ productId: product.id, quantity: 1 }] });

    await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId: other.id, items: [{ productId: product.id, quantity: 1 }] });

    const confirmed = await api
      .get('/api/challans?status=CONFIRMED')
      .set('Authorization', asSales());

    expect(confirmed.body.meta.total).toBe(1);
    expect(confirmed.body.data[0].customer.id).toBe(customerId);

    const byCustomer = await api
      .get(`/api/challans?customerId=${other.id}`)
      .set('Authorization', asSales());

    expect(byCustomer.body.meta.total).toBe(1);
    expect(byCustomer.body.data[0].status).toBe('DRAFT');
  });

  it('serves a pdf for a challan', async () => {
    const product = await createProduct({ currentStock: 40 });

    const created = await api
      .post('/api/challans')
      .set('Authorization', asSales())
      .send({ customerId, items: [{ productId: product.id, quantity: 2 }] });

    const response = await api
      .get(`/api/challans/${created.body.id}/pdf`)
      .set('Authorization', asSales())
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain(created.body.challanNumber);
    expect((response.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });
});
