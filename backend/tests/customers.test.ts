import { Role, User } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { api, bearer } from './helpers/api';
import { resetDatabase } from './helpers/database';
import { createCustomer, createUsers, customerPayload } from './helpers/factories';

let users: Record<Role, User>;

function asSales() {
  return bearer(users.SALES);
}

describe('customers', () => {
  beforeEach(async () => {
    await resetDatabase();
    users = await createUsers();
  });

  it('creates a customer against the signed in user', async () => {
    const response = await api
      .post('/api/customers')
      .set('Authorization', asSales())
      .send(customerPayload());

    expect(response.status).toBe(201);
    expect(response.body.createdBy).toEqual({ id: users.SALES.id, name: users.SALES.name });
    expect(response.body.status).toBe('ACTIVE');
  });

  it('defaults a new customer to a lead', async () => {
    const payload = customerPayload();
    delete (payload as Record<string, unknown>).status;

    const response = await api
      .post('/api/customers')
      .set('Authorization', asSales())
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('LEAD');
  });

  it('stores blank optional fields as null', async () => {
    const response = await api
      .post('/api/customers')
      .set('Authorization', asSales())
      .send(customerPayload({ email: '', gstNumber: '', notes: '' }));

    expect(response.status).toBe(201);
    expect(response.body.email).toBeNull();
    expect(response.body.gstNumber).toBeNull();
    expect(response.body.notes).toBeNull();
  });

  it('rejects an invalid mobile number', async () => {
    const response = await api
      .post('/api/customers')
      .set('Authorization', asSales())
      .send(customerPayload({ mobile: '12345' }));

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('mobile');
  });

  it('rejects a second customer with an existing mobile', async () => {
    const first = customerPayload();
    await api.post('/api/customers').set('Authorization', asSales()).send(first);

    const response = await api
      .post('/api/customers')
      .set('Authorization', asSales())
      .send(customerPayload({ mobile: first.mobile }));

    expect(response.status).toBe(409);
  });

  it('rejects moving a mobile onto another customer', async () => {
    const a = await createCustomer(users.SALES.id);
    const b = await createCustomer(users.SALES.id);

    const response = await api
      .patch(`/api/customers/${b.id}`)
      .set('Authorization', asSales())
      .send({ mobile: a.mobile });

    expect(response.status).toBe(409);
  });

  it('allows saving a customer without changing its mobile', async () => {
    const customer = await createCustomer(users.SALES.id);

    const response = await api
      .patch(`/api/customers/${customer.id}`)
      .set('Authorization', asSales())
      .send({ mobile: customer.mobile, city: 'Nashik' });

    expect(response.status).toBe(200);
    expect(response.body.city).toBe('Nashik');
  });

  it('rejects an invalid gst number', async () => {
    const response = await api
      .post('/api/customers')
      .set('Authorization', asSales())
      .send(customerPayload({ gstNumber: '27AAECS1234F1Z' }));

    expect(response.status).toBe(400);
  });

  it('rejects an invalid pincode', async () => {
    const response = await api
      .post('/api/customers')
      .set('Authorization', asSales())
      .send(customerPayload({ pincode: '4110' }));

    expect(response.status).toBe(400);
  });

  it('updates only the fields that were sent', async () => {
    const customer = await createCustomer(users.SALES.id);

    const response = await api
      .patch(`/api/customers/${customer.id}`)
      .set('Authorization', asSales())
      .send({ city: 'Nashik', status: 'INACTIVE' });

    expect(response.status).toBe(200);
    expect(response.body.city).toBe('Nashik');
    expect(response.body.status).toBe('INACTIVE');
    expect(response.body.name).toBe(customer.name);
    expect(response.body.gstNumber).toBe(customer.gstNumber);
  });

  it('clears an optional field when an empty string is sent', async () => {
    const customer = await createCustomer(users.SALES.id);

    const response = await api
      .patch(`/api/customers/${customer.id}`)
      .set('Authorization', asSales())
      .send({ gstNumber: '' });

    expect(response.status).toBe(200);
    expect(response.body.gstNumber).toBeNull();
  });

  it('returns 404 when updating a customer that does not exist', async () => {
    const response = await api
      .patch('/api/customers/00000000-0000-4000-8000-000000000000')
      .set('Authorization', asSales())
      .send({ city: 'Nashik' });

    expect(response.status).toBe(404);
  });

  it('adds a note and moves the follow up date on the customer', async () => {
    const customer = await createCustomer(users.SALES.id);
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 5);

    const response = await api
      .post(`/api/customers/${customer.id}/notes`)
      .set('Authorization', asSales())
      .send({ note: 'Quotation shared, awaiting confirmation.', followUpDate });

    expect(response.status).toBe(201);
    expect(response.body.createdBy).toEqual({ id: users.SALES.id, name: users.SALES.name });

    const updated = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(updated.followUpDate?.toISOString()).toBe(followUpDate.toISOString());
  });

  it('leaves the follow up date alone when a note carries none', async () => {
    const customer = await createCustomer(users.SALES.id);

    await api
      .post(`/api/customers/${customer.id}/notes`)
      .set('Authorization', asSales())
      .send({ note: 'Called, no answer.' });

    const updated = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(updated.followUpDate).toBeNull();
  });

  it('rejects an empty note', async () => {
    const customer = await createCustomer(users.SALES.id);

    const response = await api
      .post(`/api/customers/${customer.id}/notes`)
      .set('Authorization', asSales())
      .send({ note: '   ' });

    expect(response.status).toBe(400);
  });

  it('returns notes newest first', async () => {
    const customer = await createCustomer(users.SALES.id);

    await api
      .post(`/api/customers/${customer.id}/notes`)
      .set('Authorization', asSales())
      .send({ note: 'First call' });

    await api
      .post(`/api/customers/${customer.id}/notes`)
      .set('Authorization', asSales())
      .send({ note: 'Second call' });

    const response = await api
      .get(`/api/customers/${customer.id}/notes`)
      .set('Authorization', asSales());

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].note).toBe('Second call');
  });

  it('returns 404 for notes on a customer that does not exist', async () => {
    const response = await api
      .get('/api/customers/00000000-0000-4000-8000-000000000000/notes')
      .set('Authorization', asSales());

    expect(response.status).toBe(404);
  });

  it('filters by status and type', async () => {
    await createCustomer(users.SALES.id, { status: 'ACTIVE', type: 'WHOLESALE' });
    await createCustomer(users.SALES.id, { status: 'LEAD', type: 'RETAIL' });
    await createCustomer(users.SALES.id, { status: 'LEAD', type: 'WHOLESALE' });

    const leads = await api.get('/api/customers?status=LEAD').set('Authorization', asSales());
    expect(leads.body.meta.total).toBe(2);

    const retail = await api.get('/api/customers?type=RETAIL').set('Authorization', asSales());
    expect(retail.body.meta.total).toBe(1);

    const both = await api
      .get('/api/customers?status=LEAD&type=WHOLESALE')
      .set('Authorization', asSales());
    expect(both.body.meta.total).toBe(1);
  });

  it('treats blank filters as absent', async () => {
    await createCustomer(users.SALES.id);

    const response = await api
      .get('/api/customers?status=&type=&search=')
      .set('Authorization', asSales());

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
  });

  it('rejects a filter value outside the allowed set', async () => {
    const response = await api
      .get('/api/customers?status=ARCHIVED')
      .set('Authorization', asSales());

    expect(response.status).toBe(400);
  });

  it('searches across name, business name, mobile and gst', async () => {
    const target = await createCustomer(users.SALES.id, {
      name: 'Vikram Patil',
      businessName: 'Patil Distributors',
      mobile: '9028334466',
    });
    await createCustomer(users.SALES.id, { name: 'Sunil Kadam', businessName: 'Kadam Traders' });

    for (const term of ['vikram', 'patil dist', '9028334466']) {
      const response = await api
        .get(`/api/customers?search=${encodeURIComponent(term)}`)
        .set('Authorization', asSales());

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(target.id);
    }
  });

  it('buckets follow ups and counts each bucket', async () => {
    function due(days: number) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() + days);
      return date;
    }

    await createCustomer(users.SALES.id, { followUpDate: due(-2), status: 'ACTIVE' });
    await createCustomer(users.SALES.id, { followUpDate: due(0), status: 'LEAD' });
    await createCustomer(users.SALES.id, { followUpDate: due(4), status: 'ACTIVE' });
    await createCustomer(users.SALES.id, { followUpDate: due(-1), status: 'INACTIVE' });
    await createCustomer(users.SALES.id, { followUpDate: null });

    const all = await api.get('/api/customers/follow-ups').set('Authorization', asSales());
    expect(all.status).toBe(200);
    expect(all.body.meta.total).toBe(3);
    expect(all.body.counts).toEqual({ overdue: 1, today: 1, upcoming: 1 });

    const overdue = await api
      .get('/api/customers/follow-ups?bucket=overdue')
      .set('Authorization', asSales());
    expect(overdue.body.data).toHaveLength(1);
  });

  it('hides the follow up queue from accounts', async () => {
    const response = await api
      .get('/api/customers/follow-ups')
      .set('Authorization', bearer(users.ACCOUNTS));

    expect(response.status).toBe(403);
  });

  it('includes the recent challans on the detail view', async () => {
    const customer = await createCustomer(users.SALES.id);

    await prisma.challan.create({
      data: {
        challanNumber: 'CH-2026-9201',
        customerId: customer.id,
        createdById: users.SALES.id,
        totalQuantity: 3,
      },
    });

    const response = await api
      .get(`/api/customers/${customer.id}`)
      .set('Authorization', asSales());

    expect(response.status).toBe(200);
    expect(response.body.challans).toHaveLength(1);
    expect(response.body.challans[0].challanNumber).toBe('CH-2026-9201');
    expect(response.body.followUps).toEqual([]);
  });
});
