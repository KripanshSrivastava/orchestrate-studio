import { z } from 'zod';

import { workflowSchema } from './workflowValidators.js';

export const workflowIdParamSchema = z.object({
  workflowId: z.string().uuid('workflowId must be a valid UUID'),
});

export const createWorkflowBodySchema = z.object({
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
  definition: workflowSchema,
});

export type WorkflowIdParams = z.infer<typeof workflowIdParamSchema>;
export type CreateWorkflowBody = z.infer<typeof createWorkflowBodySchema>;
