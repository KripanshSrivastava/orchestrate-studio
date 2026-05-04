import { NextFunction, Request, Response } from 'express';

import { assertTenantContext } from '../../middleware/tenantMiddleware.js';
import { getValidated } from '../../middleware/requestValidator.js';
import { parseWorkflowPayload } from '../../validators/workflowValidators.js';
import { compileWorkflowSteps, validateWorkflowDag } from '../../services/workflow/workflowService.js';
import { createWorkflow, getWorkflowById } from '../../services/workflow/workflowStorageService.js';
import { createExecutionRun, updateExecutionRun } from '../../services/workflow/workflowExecutionService.js';
import { dispatchGithubActionsWorkflow } from '../../services/integrations/githubActionsService.js';
import secretManagerService from '../../services/secrets/secretManagerService.js';
import type { CreateWorkflowBody, WorkflowIdParams } from '../../validators/workflowApiValidators.js';

const normalizeGithubActionsValues = (values: Record<string, string>) => {
  const workflowFile = (values.workflowFile || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\s*\/\s*/g, '/')
    .replace(/^\.github\/workflows\//, '');

  return {
    ...values,
    workflowFile,
    branch: (values.branch || '').trim(),
  };
};

const getGithubDispatchValues = async (userId: string) => {
  const github = await secretManagerService.getUserIntegrationValues(userId, 'github');
  const githubActions = await secretManagerService.getUserIntegrationValues(userId, 'github-actions');

  const owner = (github.values.owner || '').trim();
  const repository = (github.values.repository || '').trim();
  const token = (github.values.token || '').trim();
  const normalizedActions = normalizeGithubActionsValues(githubActions.values);
  const workflowFile = (normalizedActions.workflowFile || '').trim();
  const branch = (normalizedActions.branch || '').trim();

  if (!owner || !repository || !token) {
    throw new Error('GitHub integration is incomplete. Provide owner, repository, and token.');
  }

  if (!workflowFile || !branch) {
    throw new Error('GitHub Actions integration is incomplete. Provide workflowFile and branch.');
  }

  return {
    owner,
    repository,
    token,
    workflowFile,
    branch,
  };
};

export const createWorkflowHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantContext = assertTenantContext(req);
    const payload = getValidated<CreateWorkflowBody>(req, 'body') as CreateWorkflowBody;

    const definition = parseWorkflowPayload(payload.definition);
    validateWorkflowDag(definition);

    const workflow = await createWorkflow(tenantContext, {
      name: payload.name,
      description: payload.description,
      definition,
    });

    res.status(201).json({
      success: true,
      data: workflow,
      traceId: (req as any).traceId,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkflowHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantContext = assertTenantContext(req);
    const params = getValidated<WorkflowIdParams>(req, 'params');
    const workflowId = params?.workflowId || req.params.workflowId;

    const workflow = await getWorkflowById(tenantContext, workflowId);

    res.status(200).json({
      success: true,
      data: workflow,
      traceId: (req as any).traceId,
    });
  } catch (error) {
    next(error);
  }
};

export const executeWorkflowHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantContext = assertTenantContext(req);
    const params = getValidated<WorkflowIdParams>(req, 'params');
    const workflowId = params?.workflowId || req.params.workflowId;

    const workflow = await getWorkflowById(tenantContext, workflowId);
    const definition = parseWorkflowPayload(workflow.definition);
    validateWorkflowDag(definition);
    const steps = compileWorkflowSteps(definition);

    const execution = await createExecutionRun(workflow.id, 'pending', {
      steps,
    });

    try {
      const dispatchValues = await getGithubDispatchValues(tenantContext.user_id);
      await dispatchGithubActionsWorkflow(dispatchValues, {
        steps: JSON.stringify(steps),
        runId: execution.id,
        workflowId: workflow.id,
      });
    } catch (error) {
      await updateExecutionRun(execution.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to dispatch GitHub workflow',
        finished_at: new Date().toISOString(),
      });
      throw error;
    }

    res.status(202).json({
      success: true,
      data: {
        run_id: execution.id,
        workflow_id: execution.workflow_id,
        status: execution.status,
      },
      traceId: (req as any).traceId,
    });
  } catch (error) {
    next(error);
  }
};
