import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { api, bearer } from './helpers/api';
import { resetDatabase } from './helpers/database';
import { TEST_PASSWORD, createUser } from './helpers/factories';
import { signToken } from '../src/utils/token';

describe('authentication', () => {
  beforeEach(resetDatabase);

  it('issues a token for valid credentials', async () => {
    const user = await createUser('ADMIN');

    const response = await api
      .post('/api/auth/login')
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      id: user.id,
      email: user.email,
      role: 'ADMIN',
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password without revealing which field failed', async () => {
    const user = await createUser('SALES');

    const response = await api
      .post('/api/auth/login')
      .send({ email: user.email, password: 'WrongPassword1' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid email or password');
  });

  it('rejects a deactivated account', async () => {
    const user = await createUser('ACCOUNTS', { isActive: false });

    const response = await api
      .post('/api/auth/login')
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(response.status).toBe(401);
  });

  it('rejects a malformed login body', async () => {
    const response = await api.post('/api/auth/login').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
    expect(response.body.error.details.map((detail: { field: string }) => detail.field)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });

  it('returns the signed in profile', async () => {
    const user = await createUser('WAREHOUSE');

    const response = await api.get('/api/auth/me').set('Authorization', bearer(user));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'WAREHOUSE',
    });
  });

  it('refuses a request with no token', async () => {
    const response = await api.get('/api/auth/me');

    expect(response.status).toBe(401);
  });

  it('refuses a token that was not signed by this service', async () => {
    const response = await api
      .get('/api/auth/me')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.notavalidsignature');

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('refuses an authorization header that is not a bearer token', async () => {
    const user = await createUser('ADMIN');

    const response = await api
      .get('/api/auth/me')
      .set('Authorization', signToken({ sub: user.id, email: user.email, role: user.role }));

    expect(response.status).toBe(401);
  });

  it('refuses a token whose user no longer exists', async () => {
    const user = await createUser('ADMIN');
    const token = bearer(user);

    await resetDatabase();

    const response = await api.get('/api/auth/me').set('Authorization', token);

    expect(response.status).toBe(401);
  });

  it('refuses an existing token as soon as the account is deactivated', async () => {
    const user = await createUser('SALES');
    const token = bearer(user);

    expect((await api.get('/api/auth/me').set('Authorization', token)).status).toBe(200);

    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    const response = await api.get('/api/auth/me').set('Authorization', token);

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('This account is no longer active');
  });

  it('applies a role change to an existing token rather than trusting its claim', async () => {
    const user = await createUser('ADMIN');
    const token = bearer(user);

    expect((await api.get('/api/users').set('Authorization', token)).status).toBe(200);

    await prisma.user.update({ where: { id: user.id }, data: { role: 'WAREHOUSE' } });

    const response = await api.get('/api/users').set('Authorization', token);

    expect(response.status).toBe(403);
  });
});
