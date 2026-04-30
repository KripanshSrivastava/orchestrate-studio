import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import secretManagerService from '../../services/secrets/secretManagerService.js';

const router = Router();

const integrationRequirements: Record<string, string[]> = {
  github: ['owner', 'repository', 'token'],
  'github-actions': ['workflowFile', 'branch'],
  snyk: ['orgId', 'apiToken'],
  sonarqube: ['serverUrl', 'projectKey', 'token'],
  trivy: ['severity', 'timeout'],
  dockerhub: ['username', 'repository', 'token'],
  argocd: ['serverUrl', 'project', 'token'],
  prometheus: ['serverUrl', 'scrapeInterval'],
  elk: ['elasticsearchUrl', 'indexPrefix'],
  alertmanager: ['serverUrl', 'receiver'],
};

const isSensitiveKey = (key: string): boolean => {
  const lower = key.toLowerCase();
  return lower.includes('token') || lower.includes('password') || lower.includes('secret') || lower.includes('key');
};

const sanitizeValues = (values: Record<string, string>): Record<string, string> => {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    sanitized[key] = isSensitiveKey(key) && value ? '********' : value;
  }

  return sanitized;
};

const isConnected = (integrationId: string, values: Record<string, string>): boolean => {
  const required = integrationRequirements[integrationId] || [];
  if (required.length === 0) {
    return false;
  }

  return required.every((field) => (values[field] || '').trim().length > 0);
};

const getUserId = (req: AuthRequest): string | null => {
  return req.user?.id || null;
};

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const saved = await secretManagerService.listUserIntegrationValues(userId);
    const state: Record<string, { connected: boolean; values: Record<string, string>; updatedAt?: string }> = {};

    for (const integrationId of Object.keys(integrationRequirements)) {
      const integration = saved[integrationId] || { values: {} };
      state[integrationId] = {
        connected: isConnected(integrationId, integration.values),
        values: sanitizeValues(integration.values),
        updatedAt: integration.updatedAt,
      };
    }

    return res.json({ success: true, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch integrations';
    return res.status(500).json({ success: false, error: message });
  }
});

router.put('/:integrationId', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const { integrationId } = req.params;
  if (!integrationRequirements[integrationId]) {
    return res.status(400).json({ success: false, error: 'Unsupported integration id' });
  }

  const values = (req.body?.values || {}) as Record<string, string>;
  const normalizedValues = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, String(value || '').trim()])
  );

  try {
    const updatedAt = await secretManagerService.upsertUserIntegrationSecret(userId, integrationId, normalizedValues);

    return res.json({
      success: true,
      integrationId,
      state: {
        connected: isConnected(integrationId, normalizedValues),
        values: sanitizeValues(normalizedValues),
        updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to store integration secret';
    return res.status(500).json({ success: false, error: message });
  }
});

router.delete('/:integrationId', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const { integrationId } = req.params;
  if (!integrationRequirements[integrationId]) {
    return res.status(400).json({ success: false, error: 'Unsupported integration id' });
  }

  try {
    await secretManagerService.removeUserIntegrationSecret(userId, integrationId);

    return res.json({
      success: true,
      integrationId,
      state: { connected: false, values: {}, updatedAt: new Date().toISOString() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove integration secret';
    return res.status(500).json({ success: false, error: message });
  }
});

router.get('/secrets/providers', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const providers = await secretManagerService.getProviderStatuses(userId);
    return res.json({ success: true, providers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load provider statuses';
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
