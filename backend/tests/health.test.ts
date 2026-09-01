import { describe, expect, it } from 'vitest';
import { api } from './helpers/api';

describe('health', () => {
  it('answers without a token', async () => {
    const response = await api.get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('reports readiness once the database answers', async () => {
    const response = await api.get('/api/health/ready');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
  });

  it('returns a json error for an unknown route', async () => {
    const response = await api.get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Route not found');
  });
});
