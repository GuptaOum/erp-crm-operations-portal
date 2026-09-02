import Redis from 'ioredis';
import { env } from '../config/env';

let client: Redis | null = null;
let warned = false;

function report(error: unknown) {
  if (!warned) {
    warned = true;
    console.warn('Redis unavailable, continuing without it', error);
  }
}

export function getClient(): Redis | null {
  if (env.redisUrl.length === 0) {
    return null;
  }

  if (!client) {
    client = new Redis(env.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 500, 5000)),
    });

    client.on('error', report);
    client.connect().catch(report);
  }

  return client;
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const redis = getClient();

  if (!redis) {
    return null;
  }

  try {
    const value = await redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (error) {
    report(error);
    return null;
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSeconds: number) {
  const redis = getClient();

  if (!redis) {
    return;
  }

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    report(error);
  }
}

export async function cacheFlush() {
  const redis = getClient();

  if (!redis) {
    return;
  }

  try {
    await redis.flushdb();
  } catch (error) {
    report(error);
  }
}

export async function closeCache() {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}
