import { z } from 'zod';

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/;

export const MOVEMENT_TYPES = ['IN', 'OUT'] as const;

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(160),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'SKU must be at least 2 characters')
    .max(40)
    .regex(SKU_PATTERN, 'SKU may only contain letters, numbers and hyphens'),
  category: z.string().trim().min(2, 'Category is required').max(80),
  unitPrice: z.coerce.number().nonnegative('Unit price cannot be negative').max(99999999),
  currentStock: z.coerce.number().int().min(0, 'Opening stock cannot be negative').default(0),
  minStockAlert: z.coerce.number().int().min(0, 'Minimum stock cannot be negative').default(0),
  location: z.string().trim().min(1, 'Location is required').max(80),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial().omit({ currentStock: true });

export const listProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  lowStock: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const adjustStockSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
  type: z.enum(MOVEMENT_TYPES),
  reason: z.string().trim().min(2, 'Reason is required').max(200),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsInput = z.infer<typeof listProductsSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
