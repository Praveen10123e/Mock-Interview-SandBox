import { z } from 'zod';
import { DEFAULT_CONFIG } from '@nm/constants';

export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters long');
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(DEFAULT_CONFIG.MAX_PAGINATION_LIMIT)
    .optional()
    .default(DEFAULT_CONFIG.PAGINATION_LIMIT),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});
