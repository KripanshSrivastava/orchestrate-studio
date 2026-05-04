import { afterAll, describe, expect, it, vi } from 'vitest';

import { query } from '../../database/pool.js';
import { createWorkflow } from '../../services/workflow/workflowStorageService.js';
import { parseWorkflowPayload } from '../../validators/workflowValidators.js';
import type { TenantContext } from '../../types/multi-tenant.js';

const githubMocks = vi.hoisted(() => ({
  dispatchGithubActionsWorkflow: vi.fn(),
}));

vi.mock('../../services/integrations/githubActionsService.js', () => ({
  dispatchGithubActionsWorkflow: githubMocks.dispatchGithubActionsWorkflow,
}));

const secretMocks = vi.hoisted(() => ({
  getUserIntegrationValues: vi.fn(),
}));

vi.mock('../../services/secrets/secretManagerService.js', () => ({
  default: {
    getUserIntegrationValues: secretMocks.getUserIntegrationValues,
  },
}));

import { executeWorkflowHandler } from '../../api/controllers/workflowController.js';

const testContext: TenantContext = {
  org_id: 'org-test',
  user_id: 'user-test',
  email: 'test@example.com',
  trace_id: 'trace-test',
};

const createdWorkflowIds: string[] = [];
const createdExecutionIds: string[] = [];

const cleanup = async () => {
  if (createdExecutionIds.length > 0) {
    await query('DELETE FROM execution_runs WHERE id = ANY($1)', [createdExecutionIds]);
  }

  if (createdWorkflowIds.length > 0) {
    await query('DELETE FROM workflows WHERE id = ANY($1)', [createdWorkflowIds]);
  }
};

afterAll(async () => {
  await cleanup();
});

describe('workflow execution', () => {
  it('creates an execution run and dispatches GitHub workflow', async () => {
    const definition = parseWorkflowPayload({
      nodes: [
        { id: 'a', type: 'build' },
        { id: 'b', type: 'test' },
      ],
      edges: [{ from: 'a', to: 'b' }],
    });

    const workflow = await createWorkflow(testContext, {
      name: `Execution Test ${Date.now()}`,
      description: 'integration test',
      definition,
    });

    createdWorkflowIds.push(workflow.id);

    secretMocks.getUserIntegrationValues.mockImplementation(async (_userId: string, integrationId: string) => {
      if (integrationId === 'github') {
        return {
          values: {
            owner: 'octo-org',
            repository: 'demo',
            token: 'token',
          },
        };
      }

      if (integrationId === 'github-actions') {
        return {
          values: {
            workflowFile: 'demo.yml',
            branch: 'main',
          },
        };
      }

      return { values: {} };
    });

    githubMocks.dispatchGithubActionsWorkflow.mockResolvedValue({
      dispatched: true,
      workflowFile: 'demo.yml',
      branch: 'main',
    });

    const req = {
      params: { workflowId: workflow.id },
      validated: { params: { workflowId: workflow.id } },
      tenantContext: testContext,
      traceId: 'trace-test',
    } as any;

    const responsePayload: { status?: number; body?: any } = {};
    const res = {
      status: (code: number) => {
        responsePayload.status = code;
        return res;
      },
      json: (body: any) => {
        responsePayload.body = body;
        return res;
      },
    } as any;

    await executeWorkflowHandler(req, res, () => undefined);

    expect(responsePayload.status).toBe(202);
    expect(responsePayload.body?.data?.workflow_id).toBe(workflow.id);
    expect(responsePayload.body?.data?.run_id).toBeDefined();

    const runId = responsePayload.body?.data?.run_id as string;
    createdExecutionIds.push(runId);

    const executionResult = await query<{ id: string; status: string }>(
      'SELECT id, status FROM execution_runs WHERE id = $1',
      [runId]
    );

    expect(executionResult.rows[0]?.id).toBe(runId);
    expect(executionResult.rows[0]?.status).toBe('pending');
    expect(githubMocks.dispatchGithubActionsWorkflow).toHaveBeenCalledTimes(1);
  });
});
