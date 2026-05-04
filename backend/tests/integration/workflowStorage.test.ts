import { afterAll, describe, expect, it } from 'vitest';

import { query } from '../../database/pool.js';
import { parseWorkflowPayload } from '../../validators/workflowValidators.js';
import { validateWorkflowDag } from '../../services/workflow/workflowService.js';
import { createWorkflow, getWorkflowById } from '../../services/workflow/workflowStorageService.js';
import type { TenantContext } from '../../types/multi-tenant.js';

const testContext: TenantContext = {
  org_id: 'org-test',
  user_id: 'user-test',
  email: 'test@example.com',
  trace_id: 'trace-test',
};

const createdWorkflowIds: string[] = [];

const cleanup = async () => {
  if (createdWorkflowIds.length === 0) return;

  await query(
    `
    DELETE FROM workflows
    WHERE id = ANY($1)
    `,
    [createdWorkflowIds]
  );
};

afterAll(async () => {
  await cleanup();
});

describe('workflow storage', () => {
  it('has workflows.definition column as jsonb', async () => {
    const result = await query<{ data_type: string }>(
      `
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'workflows'
        AND column_name = 'definition'
      `
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.data_type).toBe('jsonb');
  });

  it('creates and fetches a workflow with definition', async () => {
    const definition = parseWorkflowPayload({
      nodes: [
        { id: 'a', type: 'build' },
        { id: 'b', type: 'test' },
      ],
      edges: [{ from: 'a', to: 'b' }],
    });

    validateWorkflowDag(definition);

    const workflow = await createWorkflow(testContext, {
      name: `Test Workflow ${Date.now()}`,
      description: 'integration test',
      definition,
    });

    createdWorkflowIds.push(workflow.id);

    const fetched = await getWorkflowById(testContext, workflow.id);

    expect(fetched.id).toBe(workflow.id);
    expect(fetched.definition).toEqual(definition);
  });
});
