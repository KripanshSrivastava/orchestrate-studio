import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import secretManagerService from '../../services/secrets/secretManagerService.js';
import type { SecretProviderId } from '../../services/secrets/secretManagerService.js';
import { testGithubConnection, type GithubIntegrationValues } from '../../services/integrations/githubOctokitService.js';
import {
  dispatchGithubActionsWorkflow,
  listGithubActionsRuns,
  listGithubActionsWorkflows,
  testGithubActionsConnection,
  type GithubActionsValues,
} from '../../services/integrations/githubActionsService.js';
import { testExternalIntegration } from '../../services/integrations/externalIntegrationService.js';
import {
  normalizeGithubWebhookRepository,
  parseGithubWebhookEvents,
  removeGithubWebhookConfig,
  upsertGithubWebhookConfig,
} from '../../services/integrations/githubWebhookConfigService.js';

type IntegrationField = {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'password' | 'url';
};

type IntegrationDefinition = {
  id: string;
  name: string;
  group: string;
  description: string;
  nodeTypes: string[];
  fields: IntegrationField[];
};

type IntegrationState = {
  connected: boolean;
  values: Record<string, string>;
  updatedAt?: string;
  verification?: unknown;
};

const router = Router();

const integrationDefinitions: IntegrationDefinition[] = [
  {
    id: 'github',
    name: 'GitHub',
    group: 'Git Providers',
    description: 'GitHub API credentials for repository and workflow nodes.',
    nodeTypes: ['github'],
    fields: [
      { key: 'repository', label: 'Repository', placeholder: 'owner/repo or https://github.com/owner/repo' },
      { key: 'owner', label: 'Owner', placeholder: 'organization or username' },
      { key: 'token', label: 'GitHub Token', placeholder: 'ghp_xxx', type: 'password' },
    ],
  },
  {
    id: 'github-actions',
    name: 'GitHub Actions',
    group: 'CI Tools',
    description: 'Trigger and monitor workflow runs using your connected GitHub credentials.',
    nodeTypes: ['gh-actions', 'gh-actions-cd'],
    fields: [
      { key: 'workflowFile', label: 'Workflow File', placeholder: '.github/workflows/ci.yml' },
      { key: 'branch', label: 'Branch', placeholder: 'main' },
    ],
  },
  {
    id: 'github-webhooks',
    name: 'GitHub Webhooks',
    group: 'CI Tools',
    description: 'Receive repository push and workflow status events from GitHub.',
    nodeTypes: ['github-webhook'],
    fields: [
      { key: 'repository', label: 'Repository', placeholder: 'owner/repo or https://github.com/owner/repo' },
      { key: 'secret', label: 'Webhook Secret', placeholder: 'Use the same value in GitHub webhook settings', type: 'password' },
      { key: 'events', label: 'Events', placeholder: 'push,workflow_run' },
    ],
  },
  {
    id: 'aws-credentials',
    name: 'AWS Credentials',
    group: 'Cloud Providers',
    description: 'AWS access keys used by provisioning and deployment workflows.',
    nodeTypes: ['aws'],
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', placeholder: 'AKIA...' },
      { key: 'secretAccessKey', label: 'Secret Access Key', placeholder: 'AWS secret access key', type: 'password' },
      { key: 'region', label: 'Default Region', placeholder: 'ap-south-1' },
    ],
  },
  {
    id: 'dockerhub',
    name: 'Docker',
    group: 'Delivery',
    description: 'Docker registry credentials for build and deploy workflows.',
    nodeTypes: ['dockerhub'],
    fields: [
      { key: 'username', label: 'Username', placeholder: 'dockerhub-user' },
      { key: 'token', label: 'Access Token', placeholder: 'docker-token', type: 'password' },
    ],
  },
];

const getUserId = (req: AuthRequest): string | null => req.user?.id || null;

const getIntegrationById = (integrationId: string): IntegrationDefinition | undefined => {
  return integrationDefinitions.find((definition) => definition.id === integrationId);
};

const isSensitiveKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  return ['token', 'secret', 'password', 'key'].some((word) => normalized.includes(word));
};

const normalizeValues = (values: unknown): Record<string, string> => {
  if (!values || typeof values !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(values as Record<string, unknown>).map(([key, value]) => [key, String(value ?? '').trim()])
  );
};

const isSecretProviderId = (value: unknown): value is SecretProviderId => {
  return [
    'openbao',
    'hashicorp-vault',
    'aws-secrets-manager',
    'kubernetes-secrets',
    'azure-key-vault',
  ].includes(String(value));
};

const filterValuesForDefinition = (
  definition: IntegrationDefinition,
  values: Record<string, string>
): Record<string, string> => {
  const allowedFields = new Set(definition.fields.map((field) => field.key));
  return Object.fromEntries(Object.entries(values).filter(([key]) => allowedFields.has(key)));
};

const parseGithubRepositoryInput = (
  repository: string
): { owner?: string; repository?: string } => {
  const value = repository.trim().replace(/\.git$/i, '');

  if (!value) {
    return {};
  }

  const githubUrlMatch = value.match(/github\.com[:/]+([^/\s]+)\/([^/\s#?]+)/i);
  if (githubUrlMatch) {
    return {
      owner: githubUrlMatch[1],
      repository: githubUrlMatch[2],
    };
  }

  const shorthandMatch = value.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shorthandMatch) {
    return {
      owner: shorthandMatch[1],
      repository: shorthandMatch[2],
    };
  }

  return { repository: value };
};

const normalizeGithubValues = (values: Record<string, string>): Record<string, string> => {
  const parsed = parseGithubRepositoryInput(values.repository || '');

  return {
    ...values,
    owner: parsed.owner || values.owner || '',
    repository: parsed.repository || values.repository || '',
  };
};

const normalizeGithubActionsValues = (values: Record<string, string>): Record<string, string> => {
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

const normalizeGithubWebhookValues = (values: Record<string, string>): Record<string, string> => ({
  ...values,
  repository: normalizeGithubWebhookRepository(values.repository || ''),
  events: parseGithubWebhookEvents(values.events).join(','),
});

const normalizeIntegrationValues = (
  definition: IntegrationDefinition,
  values: Record<string, string>
): Record<string, string> => {
  const filteredValues = filterValuesForDefinition(definition, values);

  if (definition.id === 'github') {
    return normalizeGithubValues(filteredValues);
  }

  if (definition.id === 'github-actions') {
    return normalizeGithubActionsValues(filteredValues);
  }

  if (definition.id === 'github-webhooks') {
    return normalizeGithubWebhookValues(filteredValues);
  }

  return filteredValues;
};

const maskValues = (values: Record<string, string>): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, isSensitiveKey(key) && value ? '********' : value])
  );
};

const hasRequiredValues = (definition: IntegrationDefinition, values: Record<string, string>): boolean => {
  if (definition.fields.length === 0) {
    return false;
  }

  return definition.fields.every((field) => Boolean(values[field.key]?.trim()));
};

const buildGithubVerification = async (values: Record<string, string>) => {
  try {
    return await testGithubConnection(values as Partial<GithubIntegrationValues>);
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Failed to verify GitHub integration',
      repository: null,
      checkedAt: new Date().toISOString(),
    };
  }
};

const buildGithubActionsVerification = async (
  userId: string,
  values: Record<string, string>
) => {
  try {
    const github = await secretManagerService.getUserIntegrationValues(userId, 'github');
    return await testGithubActionsConnection({
      ...github.values,
      ...values,
    } as Partial<GithubIntegrationValues & GithubActionsValues>);
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Failed to verify GitHub Actions integration',
      checkedAt: new Date().toISOString(),
      workflowFile: values.workflowFile || '',
      branch: values.branch || '',
      workflows: [],
      configuredWorkflow: null,
      latestWorkflowRun: null,
    };
  }
};

const buildGithubWebhooksVerification = (values: Record<string, string>) => {
  const repository = normalizeGithubWebhookRepository(values.repository || '');
  const events = parseGithubWebhookEvents(values.events);
  const hasSecret = Boolean(values.secret?.trim());
  const healthy = Boolean(repository && repository.includes('/') && hasSecret);

  return {
    healthy,
    message: healthy
      ? `Webhook receiver configured for ${repository}`
      : 'Repository and webhook secret are required',
    checkedAt: new Date().toISOString(),
    details: {
      repository: repository || null,
      payloadUrl: '/webhooks/github',
      events: events.join(', '),
      secretStored: hasSecret,
    },
  };
};

const buildExternalVerification = async (
  definition: IntegrationDefinition,
  values: Record<string, string>
) => {
  try {
    return await testExternalIntegration(definition.id, values);
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : `Failed to verify ${definition.name} integration`,
      checkedAt: new Date().toISOString(),
      details: {},
    };
  }
};

const buildIntegrationState = async (
  definition: IntegrationDefinition,
  values: Record<string, string>,
  updatedAt?: string,
  userId?: string
): Promise<IntegrationState> => {
  const hasValues = hasRequiredValues(definition, values);
  const state: IntegrationState = {
    connected: hasValues,
    values: maskValues(values),
    updatedAt,
  };

  if (definition.id !== 'github') {
    if (definition.id === 'github-actions' && userId) {
      const verification = await buildGithubActionsVerification(userId, values);
      return {
        ...state,
        connected: hasValues && verification.healthy,
        verification,
      };
    }

    if (definition.id === 'github-webhooks') {
      const verification = buildGithubWebhooksVerification(values);
      return {
        ...state,
        connected: hasValues && verification.healthy,
        verification,
      };
    }

    const verification = await buildExternalVerification(definition, values);
    if (!verification) {
      return state;
    }

    return {
      ...state,
      connected: hasValues && verification.healthy,
      verification,
    };
  }

  const verification = await buildGithubVerification(values);
  return {
    ...state,
    connected: hasValues && verification.healthy,
    verification,
  };
};

const loadAllStates = async (userId: string): Promise<Record<string, IntegrationState>> => {
  const savedIntegrations = await secretManagerService.listUserIntegrationValues(userId);
  const states: Record<string, IntegrationState> = {};

  for (const definition of integrationDefinitions) {
    const saved = savedIntegrations[definition.id] || { values: {}, updatedAt: undefined };
    states[definition.id] = await buildIntegrationState(definition, saved.values, saved.updatedAt, userId);
  }

  return states;
};

const unauthorized = (res: Response) => {
  return res.status(401).json({ success: false, message: 'Authentication required', error: 'Authentication required' });
};

const unsupportedIntegration = (res: Response) => {
  return res.status(400).json({ success: false, message: 'Unsupported integration id', error: 'Unsupported integration id' });
};

const serverError = (res: Response, fallback: string, error: unknown) => {
  const message = error instanceof Error ? error.message : fallback;
  return res.status(500).json({ success: false, message, error: message });
};

const getCombinedGithubActionsValues = async (userId: string): Promise<Partial<GithubIntegrationValues & GithubActionsValues>> => {
  const github = await secretManagerService.getUserIntegrationValues(userId, 'github');
  const githubActions = await secretManagerService.getUserIntegrationValues(userId, 'github-actions');
  return {
    ...github.values,
    ...githubActions.values,
  };
};

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return unauthorized(res);
  }

  try {
    return res.json({
      success: true,
      state: await loadAllStates(userId),
    });
  } catch (error) {
    return serverError(res, 'Failed to load integrations', error);
  }
});

router.get('/secrets/providers', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return unauthorized(res);
  }

  try {
    const providers = await secretManagerService.getProviderStatuses(userId);
    return res.json({ success: true, providers });
  } catch (error) {
    return serverError(res, 'Failed to load provider statuses', error);
  }
});

router.get('/secrets/user', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return unauthorized(res);
  }

  try {
    const secrets = await secretManagerService.listUserSecrets(userId);
    return res.json({ success: true, secrets });
  } catch (error) {
    return serverError(res, 'Failed to load user secrets', error);
  }
});

router.put('/secrets/user/:secretId', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return unauthorized(res);
  }

  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
  const name = String(body.name || '').trim();
  const value = String(body.value || '');
  const provider = isSecretProviderId(body.provider) ? body.provider : undefined;

  if (!provider) {
    return res.status(400).json({ success: false, message: 'Secret provider is required', error: 'Secret provider is required' });
  }

  try {
    const secret = await secretManagerService.upsertUserSecret(userId, req.params.secretId, {
      name,
      value,
      provider,
    });
    return res.json({ success: true, secret });
  } catch (error) {
    return serverError(res, 'Failed to save user secret', error);
  }
});

router.delete('/secrets/user/:provider/:secretId', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return unauthorized(res);
  }

  if (!isSecretProviderId(req.params.provider)) {
    return res.status(400).json({ success: false, message: 'Unsupported secret provider', error: 'Unsupported secret provider' });
  }

  try {
    await secretManagerService.removeUserSecret(userId, req.params.provider, req.params.secretId);
    return res.json({ success: true, provider: req.params.provider, secretId: req.params.secretId });
  } catch (error) {
    return serverError(res, 'Failed to remove user secret', error);
  }
});

router.get('/:integrationId/status', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return unauthorized(res);
  }

  const definition = getIntegrationById(req.params.integrationId);
  if (!definition) {
    return unsupportedIntegration(res);
  }

  try {
    const saved = await secretManagerService.getUserIntegrationValues(userId, definition.id);
    return res.json({
      success: true,
      integrationId: definition.id,
      state: await buildIntegrationState(definition, saved.values, saved.updatedAt, userId),
    });
  } catch (error) {
    return serverError(res, 'Failed to load integration status', error);
  }
});

router.post('/:integrationId/actions/:action', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return unauthorized(res);
  }

  const definition = getIntegrationById(req.params.integrationId);
  if (!definition) {
    return unsupportedIntegration(res);
  }

  try {
    if (req.params.action === 'test' && definition.id !== 'github-actions') {
      const saved = await secretManagerService.getUserIntegrationValues(userId, definition.id);
      const verification = await testExternalIntegration(definition.id, saved.values);

      if (!verification) {
        return unsupportedIntegration(res);
      }

      return res.json({ success: true, verification });
    }

    if (definition.id !== 'github-actions') {
      return res.status(400).json({ success: false, message: 'Unsupported integration action', error: 'Unsupported integration action' });
    }

    const values = await getCombinedGithubActionsValues(userId);

    switch (req.params.action) {
      case 'test': {
        const verification = await testGithubActionsConnection(values);
        return res.json({ success: true, verification });
      }
      case 'list-workflows': {
        const workflows = await listGithubActionsWorkflows(values);
        return res.json({ success: true, workflows });
      }
      case 'list-runs': {
        const runs = await listGithubActionsRuns(values);
        return res.json({ success: true, runs });
      }
      case 'dispatch': {
        const inputs = req.body?.inputs && typeof req.body.inputs === 'object'
          ? req.body.inputs as Record<string, string>
          : {};
        const result = await dispatchGithubActionsWorkflow(values, inputs);
        return res.json({ success: true, result });
      }
      default:
        return res.status(400).json({ success: false, message: 'Unsupported GitHub Actions action', error: 'Unsupported GitHub Actions action' });
    }
  } catch (error) {
    return serverError(res, 'Failed to run GitHub Actions action', error);
  }
});

router.put('/:integrationId', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return unauthorized(res);
  }

  const definition = getIntegrationById(req.params.integrationId);
  if (!definition) {
    return unsupportedIntegration(res);
  }

  const values = normalizeIntegrationValues(definition, normalizeValues(req.body?.values));

  try {
    const updatedAt = await secretManagerService.upsertUserIntegrationSecret(userId, definition.id, values);
    if (definition.id === 'github-webhooks') {
      await upsertGithubWebhookConfig(userId, {
        repository: values.repository,
        secret: values.secret,
        events: values.events,
      });
    }
    return res.json({
      success: true,
      integrationId: definition.id,
      state: await buildIntegrationState(definition, values, updatedAt, userId),
    });
  } catch (error) {
    return serverError(res, 'Failed to save integration', error);
  }
});

router.delete('/:integrationId', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return unauthorized(res);
  }

  const definition = getIntegrationById(req.params.integrationId);
  if (!definition) {
    return unsupportedIntegration(res);
  }

  try {
    if (definition.id === 'github-webhooks') {
      const saved = await secretManagerService.getUserIntegrationValues(userId, definition.id);
      await removeGithubWebhookConfig(userId, saved.values.repository || '');
    }
    await secretManagerService.removeUserIntegrationSecret(userId, definition.id);
    return res.json({
      success: true,
      integrationId: definition.id,
      state: {
        connected: false,
        values: {},
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return serverError(res, 'Failed to remove integration', error);
  }
});

export default router;
