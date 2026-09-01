import { Role, User } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { api, bearer } from './helpers/api';
import { resetDatabase } from './helpers/database';
import { createProduct, createUsers, productPayload, stockOf } from './helpers/factories';

let users: Record<Role, User>;

function asWarehouse() {
  return bearer(users.WAREHOUSE);
}

describe('products and inventory', () => {
  beforeEach(async () => {
    await resetDatabase();
    users = await createUsers();
  });

  it('records an opening movement when a product is created with stock', async () => {
    const response = await api
      .post('/api/products')
      .set('Authorization', asWarehouse())
      .send(productPayload({ currentStock: 75 }));

    expect(response.status).toBe(201);
    expect(response.body.currentStock).toBe(75);
    expect(response.body.unitPrice).toBe(1890);
    expect(response.body).not.toHaveProperty('imageKey');
    expect(response.body.imageUrl).toBeNull();

    const movements = await prisma.stockMovement.findMany();
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      quantity: 75,
      type: 'IN',
      reason: 'Opening stock',
      referenceType: 'PRODUCT',
      createdById: users.WAREHOUSE.id,
    });
  });

  it('does not record a movement when a product is created with no stock', async () => {
    const response = await api
      .post('/api/products')
      .set('Authorization', asWarehouse())
      .send(productPayload({ currentStock: 0 }));

    expect(response.status).toBe(201);
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it('normalises the sku to upper case and rejects a duplicate', async () => {
    const payload = productPayload({ sku: 'tst-0999' });

    const first = await api
      .post('/api/products')
      .set('Authorization', asWarehouse())
      .send(payload);

    expect(first.status).toBe(201);
    expect(first.body.sku).toBe('TST-0999');

    const second = await api
      .post('/api/products')
      .set('Authorization', asWarehouse())
      .send(productPayload({ sku: 'TST-0999' }));

    expect(second.status).toBe(409);
  });

  it('rejects a sku with unsupported characters', async () => {
    const response = await api
      .post('/api/products')
      .set('Authorization', asWarehouse())
      .send(productPayload({ sku: 'BAD SKU!' }));

    expect(response.status).toBe(400);
  });

  it('increases stock on an inward adjustment', async () => {
    const product = await createProduct({ currentStock: 30 });

    const response = await api
      .post(`/api/products/${product.id}/stock`)
      .set('Authorization', asWarehouse())
      .send({ quantity: 20, type: 'IN', reason: 'Purchase receipt' });

    expect(response.status).toBe(200);
    expect(response.body.currentStock).toBe(50);

    const movement = await prisma.stockMovement.findFirstOrThrow();
    expect(movement).toMatchObject({ quantity: 20, type: 'IN', referenceType: 'MANUAL' });
  });

  it('reduces stock on an outward adjustment', async () => {
    const product = await createProduct({ currentStock: 30 });

    const response = await api
      .post(`/api/products/${product.id}/stock`)
      .set('Authorization', asWarehouse())
      .send({ quantity: 12, type: 'OUT', reason: 'Damaged in handling' });

    expect(response.status).toBe(200);
    expect(response.body.currentStock).toBe(18);
  });

  it('refuses an outward adjustment larger than the stock on hand', async () => {
    const product = await createProduct({ currentStock: 5 });

    const response = await api
      .post(`/api/products/${product.id}/stock`)
      .set('Authorization', asWarehouse())
      .send({ quantity: 6, type: 'OUT', reason: 'Damaged in handling' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Insufficient stock');
    expect(await stockOf(product.id)).toBe(5);
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it('refuses an adjustment with no reason', async () => {
    const product = await createProduct();

    const response = await api
      .post(`/api/products/${product.id}/stock`)
      .set('Authorization', asWarehouse())
      .send({ quantity: 1, type: 'IN' });

    expect(response.status).toBe(400);
  });

  it('ignores an attempt to set current stock through an update', async () => {
    const product = await createProduct({ currentStock: 30 });

    const response = await api
      .patch(`/api/products/${product.id}`)
      .set('Authorization', asWarehouse())
      .send({ currentStock: 9999, location: 'Rack Z1' });

    expect(response.status).toBe(200);
    expect(response.body.location).toBe('Rack Z1');
    expect(response.body.currentStock).toBe(30);
  });

  it('filters products that have fallen to the alert level', async () => {
    await createProduct({ currentStock: 100, minStockAlert: 20 });
    const low = await createProduct({ currentStock: 8, minStockAlert: 20 });
    const exactly = await createProduct({ currentStock: 20, minStockAlert: 20 });

    const response = await api
      .get('/api/products?lowStock=true')
      .set('Authorization', asWarehouse());

    expect(response.status).toBe(200);
    expect(response.body.data.map((item: { id: string }) => item.id).sort()).toEqual(
      [low.id, exactly.id].sort(),
    );
  });

  it('searches by name and sku', async () => {
    const cable = await createProduct({ name: 'Armoured Cable 4 Core', sku: 'CBL-AR46' });
    await createProduct({ name: 'LED Batten 20W', sku: 'LGT-BT20' });

    const byName = await api
      .get('/api/products?search=armoured')
      .set('Authorization', asWarehouse());
    expect(byName.body.data).toHaveLength(1);
    expect(byName.body.data[0].id).toBe(cable.id);

    const bySku = await api.get('/api/products?search=lgt-').set('Authorization', asWarehouse());
    expect(bySku.body.data).toHaveLength(1);
  });

  it('lists the distinct categories', async () => {
    await createProduct({ category: 'Cables' });
    await createProduct({ category: 'Cables' });
    await createProduct({ category: 'Lighting' });

    const response = await api.get('/api/products/categories').set('Authorization', asWarehouse());

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(['Cables', 'Lighting']);
  });

  it('paginates the list', async () => {
    for (let index = 0; index < 5; index += 1) {
      await createProduct();
    }

    const response = await api
      .get('/api/products?page=2&limit=2')
      .set('Authorization', asWarehouse());

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toEqual({ total: 5, page: 2, limit: 2, totalPages: 3 });
  });

  it('rejects a page size above the cap', async () => {
    const response = await api
      .get('/api/products?limit=500')
      .set('Authorization', asWarehouse());

    expect(response.status).toBe(400);
  });

  it('reports that image storage is unavailable when no bucket is configured', async () => {
    const product = await createProduct();

    const response = await api
      .post(`/api/products/${product.id}/image`)
      .set('Authorization', asWarehouse())
      .attach('image', Buffer.from('fake-image-bytes'), {
        filename: 'product.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(503);
  });

  it('rejects an upload that is not an image', async () => {
    const product = await createProduct();

    const response = await api
      .post(`/api/products/${product.id}/image`)
      .set('Authorization', asWarehouse())
      .attach('image', Buffer.from('not an image'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
  });
});

describe('stock movement history', () => {
  beforeEach(async () => {
    await resetDatabase();
    users = await createUsers();
  });

  it('filters movements by product and direction', async () => {
    const first = await createProduct({ currentStock: 50 });
    const second = await createProduct({ currentStock: 50 });

    await api
      .post(`/api/products/${first.id}/stock`)
      .set('Authorization', asWarehouse())
      .send({ quantity: 5, type: 'IN', reason: 'Purchase receipt' });

    await api
      .post(`/api/products/${first.id}/stock`)
      .set('Authorization', asWarehouse())
      .send({ quantity: 3, type: 'OUT', reason: 'Damaged in handling' });

    await api
      .post(`/api/products/${second.id}/stock`)
      .set('Authorization', asWarehouse())
      .send({ quantity: 8, type: 'IN', reason: 'Purchase receipt' });

    const byProduct = await api
      .get(`/api/stock-movements?productId=${first.id}`)
      .set('Authorization', asWarehouse());

    expect(byProduct.status).toBe(200);
    expect(byProduct.body.meta.total).toBe(2);

    const outward = await api
      .get('/api/stock-movements?type=OUT')
      .set('Authorization', asWarehouse());

    expect(outward.body.meta.total).toBe(1);
    expect(outward.body.data[0].product.id).toBe(first.id);
    expect(outward.body.data[0].createdBy.name).toBe(users.WAREHOUSE.name);
  });

  it('treats blank filters as absent', async () => {
    await createProduct({ currentStock: 10 });

    const response = await api
      .get('/api/stock-movements?productId=&type=')
      .set('Authorization', asWarehouse());

    expect(response.status).toBe(200);
  });
});
