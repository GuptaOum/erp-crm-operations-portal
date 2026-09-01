import { Role, User } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { api, bearer } from './helpers/api';
import { resetDatabase } from './helpers/database';
import { TEST_PASSWORD, createUsers } from './helpers/factories';

let users: Record<Role, User>;

function asAdmin() {
  return bearer(users.ADMIN);
}

function staffPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Prakash Shinde',
    email: 'prakash@example.com',
    role: 'SALES',
    password: 'Portal@2026',
    ...overrides,
  };
}

describe('user management', () => {
  beforeEach(async () => {
    await resetDatabase();
    users = await createUsers();
  });

  it('creates a staff account that can sign in immediately', async () => {
    const created = await api
      .post('/api/users')
      .set('Authorization', asAdmin())
      .send(staffPayload());

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: 'Prakash Shinde',
      email: 'prakash@example.com',
      role: 'SALES',
      isActive: true,
    });
    expect(created.body).not.toHaveProperty('passwordHash');

    const login = await api
      .post('/api/auth/login')
      .send({ email: 'prakash@example.com', password: 'Portal@2026' });

    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('SALES');
  });

  it('stores the email in lower case and rejects a duplicate', async () => {
    const created = await api
      .post('/api/users')
      .set('Authorization', asAdmin())
      .send(staffPayload({ email: 'Prakash@Example.COM' }));

    expect(created.status).toBe(201);
    expect(created.body.email).toBe('prakash@example.com');

    const duplicate = await api
      .post('/api/users')
      .set('Authorization', asAdmin())
      .send(staffPayload({ email: 'prakash@example.com' }));

    expect(duplicate.status).toBe(409);
  });

  it('rejects a password that is too short or has no digit', async () => {
    for (const password of ['Short1', 'nodigitshere']) {
      const response = await api
        .post('/api/users')
        .set('Authorization', asAdmin())
        .send(staffPayload({ password }));

      expect(response.status).toBe(400);
    }

    expect(await prisma.user.count()).toBe(4);
  });

  it('rejects a role outside the four supported ones', async () => {
    const response = await api
      .post('/api/users')
      .set('Authorization', asAdmin())
      .send(staffPayload({ role: 'SUPERUSER' }));

    expect(response.status).toBe(400);
  });

  it('never returns the password hash on the list', async () => {
    const response = await api.get('/api/users').set('Authorization', asAdmin());

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(4);

    for (const user of response.body.data) {
      expect(user).not.toHaveProperty('passwordHash');
      expect(Object.keys(user).sort()).toEqual(
        ['createdAt', 'email', 'id', 'isActive', 'name', 'role', 'updatedAt'].sort(),
      );
    }
  });

  it('filters the list by role, status and search', async () => {
    await api.post('/api/users').set('Authorization', asAdmin()).send(staffPayload());

    const sales = await api.get('/api/users?role=SALES').set('Authorization', asAdmin());
    expect(sales.body.meta.total).toBe(2);

    await prisma.user.update({ where: { id: users.SALES.id }, data: { isActive: false } });

    const active = await api.get('/api/users?isActive=true').set('Authorization', asAdmin());
    expect(active.body.meta.total).toBe(4);

    const search = await api.get('/api/users?search=prakash').set('Authorization', asAdmin());
    expect(search.body.meta.total).toBe(1);
    expect(search.body.data[0].email).toBe('prakash@example.com');
  });

  it('treats blank filters as absent', async () => {
    const response = await api
      .get('/api/users?role=&isActive=&search=')
      .set('Authorization', asAdmin());

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(4);
  });

  it('renames a user and changes their role', async () => {
    const response = await api
      .patch(`/api/users/${users.SALES.id}`)
      .set('Authorization', asAdmin())
      .send({ name: 'Rohit K', role: 'ACCOUNTS' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'Rohit K', role: 'ACCOUNTS' });
  });

  it('locks a deactivated user out of the whole portal', async () => {
    const token = bearer(users.WAREHOUSE);

    const response = await api
      .patch(`/api/users/${users.WAREHOUSE.id}`)
      .set('Authorization', asAdmin())
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.isActive).toBe(false);

    expect((await api.get('/api/products').set('Authorization', token)).status).toBe(401);

    const login = await api
      .post('/api/auth/login')
      .send({ email: users.WAREHOUSE.email, password: TEST_PASSWORD });

    expect(login.status).toBe(401);
  });

  it('lets a reactivated user back in', async () => {
    await api
      .patch(`/api/users/${users.WAREHOUSE.id}`)
      .set('Authorization', asAdmin())
      .send({ isActive: false });

    const response = await api
      .patch(`/api/users/${users.WAREHOUSE.id}`)
      .set('Authorization', asAdmin())
      .send({ isActive: true });

    expect(response.status).toBe(200);
    expect((await api.get('/api/products').set('Authorization', bearer(users.WAREHOUSE))).status).toBe(
      200,
    );
  });

  it('refuses to let an admin deactivate their own account', async () => {
    const response = await api
      .patch(`/api/users/${users.ADMIN.id}`)
      .set('Authorization', asAdmin())
      .send({ isActive: false });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('You cannot deactivate your own account');
  });

  it('refuses to let an admin demote themselves', async () => {
    const response = await api
      .patch(`/api/users/${users.ADMIN.id}`)
      .set('Authorization', asAdmin())
      .send({ role: 'SALES' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('You cannot change your own role');
  });

  it('allows an admin to send their own name through unchanged', async () => {
    const response = await api
      .patch(`/api/users/${users.ADMIN.id}`)
      .set('Authorization', asAdmin())
      .send({ name: 'Anita D', role: 'ADMIN' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Anita D');
  });

  it('always leaves at least one admin behind', async () => {
    const second = await api
      .post('/api/users')
      .set('Authorization', asAdmin())
      .send(staffPayload({ role: 'ADMIN' }));

    const promoted = await prisma.user.findUniqueOrThrow({ where: { id: second.body.id } });

    const demoted = await api
      .patch(`/api/users/${users.ADMIN.id}`)
      .set('Authorization', bearer(promoted))
      .send({ role: 'SALES' });

    expect(demoted.status).toBe(200);

    const selfDemotion = await api
      .patch(`/api/users/${promoted.id}`)
      .set('Authorization', bearer(promoted))
      .send({ role: 'SALES' });

    expect(selfDemotion.status).toBe(400);
    expect(await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })).toBe(1);
  });

  it('resets a password and invalidates the old one', async () => {
    const response = await api
      .post(`/api/users/${users.SALES.id}/password`)
      .set('Authorization', asAdmin())
      .send({ password: 'NewPortal@2027' });

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('passwordHash');

    const oldPassword = await api
      .post('/api/auth/login')
      .send({ email: users.SALES.email, password: TEST_PASSWORD });
    expect(oldPassword.status).toBe(401);

    const newPassword = await api
      .post('/api/auth/login')
      .send({ email: users.SALES.email, password: 'NewPortal@2027' });
    expect(newPassword.status).toBe(200);
  });

  it('rejects a weak password on reset', async () => {
    const response = await api
      .post(`/api/users/${users.SALES.id}/password`)
      .set('Authorization', asAdmin())
      .send({ password: 'abc' });

    expect(response.status).toBe(400);
  });

  it('returns 404 for a user that does not exist', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';

    expect(
      (
        await api
          .patch(`/api/users/${missing}`)
          .set('Authorization', asAdmin())
          .send({ name: 'Nobody' })
      ).status,
    ).toBe(404);

    expect(
      (
        await api
          .post(`/api/users/${missing}/password`)
          .set('Authorization', asAdmin())
          .send({ password: 'Portal@2026' })
      ).status,
    ).toBe(404);
  });
});
