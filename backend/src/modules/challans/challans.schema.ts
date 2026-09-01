import { z } from 'zod';
import { emptyToUndefined } from '../../utils/schema';

export const CHALLAN_STATUSES = ['DRAFT', 'CONFIRMED', 'CANCELLED'] as const;

export const createChallanSchema = z.object({
  customerId: z.uuid('Select a customer'),
  notes: z.string().trim().max(2000).optional(),
  confirm: z.boolean().default(false),
  items: z
    .array(
      z.object({
        productId: z.uuid('Select a product'),
        quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
      }),
    )
    .min(1, 'Add at least one product'),
});

export const listChallansSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.preprocess(emptyToUndefined, z.enum(CHALLAN_STATUSES).optional()),
  customerId: z.preprocess(emptyToUndefined, z.uuid().optional()),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type ListChallansInput = z.infer<typeof listChallansSchema>;
