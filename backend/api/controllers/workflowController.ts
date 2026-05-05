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

const buildWorkflowStudioDispatchInputs = (
  runId: string,
  workflowId: string,
  steps: unknown,
  inputs: Record<string, unknown> = {},
  templateId?: string
): Record<string, string> => ({
  steps: JSON.stringify({
    runId,
    workflowId,
    template: templateId || 'local-load-stack',
    templateId,
    environment: typeof inputs.environment === 'string' && inputs.environment.trim() ? inputs.environment : 'local',
    run_load_test: Boolean(inputs.run_load_test),
    steps,
    inputs,
  }),
});

const getGithubDispatchErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Failed to dispatch GitHub workflow';

  if (/unexpected inputs?/i.test(message) || /provided invalid input/i.test(message)) {
    return `${message}. Check the configured GitHub Actions workflow_dispatch inputs. The Workflow Studio runner expects a single "steps" input.`;
  }

  return message;
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
    const { EC2_HOST, EC2_USER, APP_PORT, deploy_mode } = req.body;

    const workflow = await getWorkflowById(tenantContext, workflowId);
    const definition = parseWorkflowPayload(workflow.definition);
    validateWorkflowDag(definition);
    const steps = compileWorkflowSteps(definition);

    const execution = await createExecutionRun(workflow.id, 'pending', {
      steps,
      EC2_HOST,
      EC2_USER,
      APP_PORT,
      deploy_mode,
    });

    try {
      const dispatchValues = await getGithubDispatchValues(tenantContext.user_id);
      const workflowInputs = buildWorkflowStudioDispatchInputs(
        execution.id,
        workflow.id,
        steps,
        {
          EC2_HOST,
          EC2_USER,
          APP_PORT,
          deploy_mode,
        }
      );

      await dispatchGithubActionsWorkflow(dispatchValues, workflowInputs);
    } catch (error) {
      const message = getGithubDispatchErrorMessage(error);
      await updateExecutionRun(execution.id, {
        status: 'failed',
        error: message,
        finished_at: new Date().toISOString(),
      });
      res.status(400).json({
        success: false,
        error: message,
      });
      return;
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

import { workflowTemplates } from '../../config/workflowTemplates.js';

export const getWorkflowTemplatesHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      data: workflowTemplates
    });
  } catch (error) {
    next(error);
  }
};

export const runWorkflowTemplateHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId } = req.params;
    const { inputs = {} } = req.body;
    const tenantContext = assertTenantContext(req);

    const template = workflowTemplates.find(t => t.id === templateId);
    if (!template) {
      res.status(404).json({ error: `Template not found: ${templateId}` });
      return;
    }

    // Validate required inputs
    const missingInputs: string[] = [];
    for (const reqInput of template.requiredInputs) {
      if (!inputs[reqInput]) {
        missingInputs.push(reqInput);
      }
    }
    if (missingInputs.length > 0) {
      res.status(400).json({
        error: `Missing required inputs: ${missingInputs.join(', ')}`,
        requiredInputs: template.requiredInputs,
        providedInputs: Object.keys(inputs)
      });
      return;
    }

    // Validate branch is provided (needed for GitHub dispatch)
    if (!inputs.branch) {
      res.status(400).json({
        error: 'Branch is required to dispatch workflow',
        hint: 'Provide branch in inputs (e.g., "main")'
      });
      return;
    }

    // Enforce allowed app_port
    if (inputs.app_port) {
      const allowedPorts = [80, 443, 3000];
      if (!allowedPorts.includes(Number(inputs.app_port))) {
        res.status(400).json({ error: `Invalid app_port. Allowed: ${allowedPorts.join(', ')}` });
        return;
      }
    }

    // Validate deploy_mode
    if (template.deploy_mode && !['node', 'docker'].includes(template.deploy_mode)) {
       res.status(400).json({ error: `Unknown deploy mode: ${template.deploy_mode}. Allowed: node, docker` });
       return;
    }

    // Validate secrets exist in user's vault
    if (template.secretsRequired.length > 0) {
      const userSecrets = await secretManagerService.listUserSecrets(tenantContext.user_id);
      const missingSecrets: string[] = [];
      for (const secret of template.secretsRequired) {
        if (!userSecrets.some(s => s.name === secret)) {
          missingSecrets.push(secret);
        }
      }
      if (missingSecrets.length > 0) {
        res.status(400).json({
          error: `Missing required secrets: ${missingSecrets.join(', ')}`,
          hint: `Store these in Settings > Secrets`,
          missingSecrets,
          requiredSecrets: template.secretsRequired
        });
        return;
      }
    }

    // Create workflow definition from template
    const workflowDefinition = {
      nodes: template.flow.map((step, i) => ({
        id: `node-${i}`,
        type: 'pipeline',
        data: { label: step, nodeType: step, category: template.category, status: 'idle' },
        position: { x: i * 200, y: 100 }
      })),
      edges: template.flow.slice(0, -1).map((_, i) => ({
        id: `edge-${i}`,
        source: `node-${i}`,
        target: `node-${i+1}`
      }))
    };

    // Generate unique suffix to avoid workflow name conflicts when running same template multiple times
    const uniqueSuffix = Date.now().toString().slice(-6);

    const workflow = await createWorkflow(tenantContext, {
      name: `${template.name} (${inputs.repo || 'template-run'}) [${uniqueSuffix}]`,
      description: `Instantiated from template: ${template.name}. Steps: ${template.flow.join(' → ')}`,
      definition: workflowDefinition as any
    });

    // Create execution record with 'pending' status
    const execution = await createExecutionRun(workflow.id, 'pending', {
      template_id: templateId,
      steps: template.flow,
      ...inputs
    });

    try {
      // Dispatch to GitHub Actions
      const dispatchValues = await getGithubDispatchValues(tenantContext.user_id);
      const workflowInputs = buildWorkflowStudioDispatchInputs(
        execution.id,
        workflow.id,
        template.flow,
        inputs,
        templateId
      );

      await dispatchGithubActionsWorkflow(dispatchValues, workflowInputs);

      console.log(`[template] Dispatched template ${templateId} as run ${execution.id}`);
    } catch (error) {
      const message = getGithubDispatchErrorMessage(error);
      console.error(`[template] Failed to dispatch template ${templateId}:`, error);
      await updateExecutionRun(execution.id, {
        status: 'failed',
        error: message,
        finished_at: new Date().toISOString()
      }).catch(console.error);

      res.status(400).json({
        success: false,
        error: message,
      });
      return;
    }

    res.status(202).json({
      success: true,
      message: `Template ${template.name} dispatched to GitHub Actions`,
      data: {
        run_id: execution.id,
        workflow_id: workflow.id,
        status: execution.status,
        template_id: templateId,
        template_name: template.name
      }
    });

  } catch (error) {
    next(error);
  }
};
