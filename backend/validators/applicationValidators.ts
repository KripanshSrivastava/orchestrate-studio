import { z } from 'zod';

const applicationStatusSchema = z.enum(['active', 'inactive', 'archived', 'deleted']);

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return value;
}, z.boolean());

export const applicationIdParamSchema = z.object({
  applicationId: z.string().uuid('applicationId must be a valid UUID'),
});

export const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: applicationStatusSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'name', 'status']).default('created_at'),
  sortDirection: z.enum(['asc', 'desc', 'ASC', 'DESC']).default('desc'),
  includeDeleted: booleanFromQuery.default(false),
});

export const createApplicationBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'name must be at least 3 characters')
    .max(120, 'name must be at most 120 characters')
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._ -]*$/, 'name contains invalid characters'),
  description: z
    .string()
    .trim()
    .min(1, 'description cannot be empty')
    .max(2000, 'description must be at most 2000 characters')
    .optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const updateApplicationBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'name must be at least 3 characters')
      .max(120, 'name must be at most 120 characters')
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._ -]*$/, 'name contains invalid characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, 'description must be at most 2000 characters')
      .optional(),
    status: z.enum(['active', 'inactive', 'archived', 'deleted']).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: 'At least one field (name, description, status) must be provided',
  });

export const deleteApplicationQuerySchema = z.object({
  hard: booleanFromQuery.default(false),
});

export type ApplicationIdParams = z.infer<typeof applicationIdParamSchema>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
export type CreateApplicationBody = z.infer<typeof createApplicationBodySchema>;
export type UpdateApplicationBody = z.infer<typeof updateApplicationBodySchema>;
export type DeleteApplicationQuery = z.infer<typeof deleteApplicationQuerySchema>;
