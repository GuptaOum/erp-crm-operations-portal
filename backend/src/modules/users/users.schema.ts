import { z } from 'zod';
import { emptyToUndefined } from '../../utils/schema';

export const ROLES = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as const;

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  role: z.enum(ROLES),
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.preprocess(emptyToUndefined, z.enum(ROLES).optional()),
  isActive: z.preprocess(
    emptyToUndefined,
    z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  ),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
