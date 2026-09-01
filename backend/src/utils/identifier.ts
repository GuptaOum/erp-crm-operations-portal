import { z } from 'zod';

const idSchema = z.uuid('Invalid identifier');

export function parseId(value: unknown): string {
  return idSchema.parse(value);
}
