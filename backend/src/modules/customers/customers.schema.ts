import { z } from 'zod';
import { emptyToUndefined } from '../../utils/schema';

const GST_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const PINCODE_PATTERN = /^\d{6}$/;

export const CUSTOMER_TYPES = ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'] as const;
export const CUSTOMER_STATUSES = ['LEAD', 'ACTIVE', 'INACTIVE'] as const;

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  mobile: z.string().trim().regex(MOBILE_PATTERN, 'Enter a valid 10 digit mobile number'),
  email: z.union([z.email('Enter a valid email address'), z.literal('')]).optional(),
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters').max(160),
  gstNumber: z
    .union([z.string().trim().regex(GST_PATTERN, 'Enter a valid 15 character GST number'), z.literal('')])
    .optional(),
  type: z.enum(CUSTOMER_TYPES),
  addressLine: z.string().trim().min(3, 'Address is required').max(240),
  city: z.string().trim().min(2, 'City is required').max(80),
  state: z.string().trim().min(2, 'State is required').max(80),
  pincode: z.string().trim().regex(PINCODE_PATTERN, 'Enter a valid 6 digit pincode'),
  status: z.enum(CUSTOMER_STATUSES).default('LEAD'),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.preprocess(emptyToUndefined, z.enum(CUSTOMER_STATUSES).optional()),
  type: z.preprocess(emptyToUndefined, z.enum(CUSTOMER_TYPES).optional()),
});

export const createNoteSchema = z.object({
  note: z.string().trim().min(1, 'Note cannot be empty').max(2000),
  followUpDate: z.coerce.date().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersInput = z.infer<typeof listCustomersSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
