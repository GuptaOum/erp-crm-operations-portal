import { z } from 'zod';
import { emptyToUndefined } from '../../utils/schema';

export const listMovementsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productId: z.preprocess(emptyToUndefined, z.uuid().optional()),
  type: z.preprocess(emptyToUndefined, z.enum(['IN', 'OUT']).optional()),
});

export type ListMovementsInput = z.infer<typeof listMovementsSchema>;
