import { ApiErrors } from '../../middleware/errorHandler.js';
import { query } from '../../database/pool.js';
import type { TenantContext } from '../../types/multi-tenant.js';
import type { WorkflowGraph } from '../../validators/workflowValidators.js';

export interface WorkflowEntity {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: string;
  definition: WorkflowGraph;
  created_at: string;
  updated_at: string;
}

interface WorkflowRecord {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: string;
  definition: WorkflowGraph;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  definition: WorkflowGraph;
}

const toIsoString = (value: string | Date): string => {
  return value instanceof Date ? value.toISOString() : value;
};

const normalizeWorkflow = (record: WorkflowRecord): WorkflowEntity => ({
  ...record,
  created_at: toIsoString(record.created_at),
  updated_at: toIsoString(record.updated_at),
});

const mapPgError = (error: unknown): never => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: string }).code);
    if (code === '23505') {
      throw ApiErrors.conflict('Workflow name already exists in this organization');
    }
  }

  throw ApiErrors.internalError('Failed to process workflow request');
};

export const createWorkflow = async (
  context: TenantContext,
  payload: CreateWorkflowInput
): Promise<WorkflowEntity> => {
  try {
    const result = await query<WorkflowRecord>(
      `
      INSERT INTO workflows (org_id, name, description, status, definition)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING id, org_id, name, description, status, definition, created_at, updated_at
      `,
      [
        context.org_id,
        payload.name.trim(),
        payload.description?.trim() || null,
        'draft',
        payload.definition,
      ]
    );

    const record = result.rows[0];
    if (!record) {
      throw ApiErrors.internalError('Failed to create workflow');
    }

    return normalizeWorkflow(record);
  } catch (error) {
    mapPgError(error);
  }
};

export const getWorkflowById = async (
  context: TenantContext,
  workflowId: string
): Promise<WorkflowEntity> => {
  const result = await query<WorkflowRecord>(
    `
    SELECT id, org_id, name, description, status, definition, created_at, updated_at
    FROM workflows
    WHERE org_id = $1 AND id = $2
    LIMIT 1
    `,
    [context.org_id, workflowId]
  );

  const record = result.rows[0];
  if (!record) {
    throw ApiErrors.notFound('Workflow not found');
  }

  return normalizeWorkflow(record);
};
