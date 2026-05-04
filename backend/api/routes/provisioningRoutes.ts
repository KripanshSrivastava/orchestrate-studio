import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import provisioningService from '../../services/provisioning/provisioningService.js';

const router = Router();

const getUserContext = (req: AuthRequest): { userId: string; orgId: string } | null => {
  const userId = req.user?.id;
  const orgId = req.user?.org_id;

  if (!userId || !orgId) {
    return null;
  }

  return { userId, orgId };
};

const unauthorized = (res: Response) => {
  return res.status(401).json({ success: false, message: 'Authentication required', error: 'Authentication required' });
};

const serverError = (res: Response, fallback: string, error: unknown) => {
  const message = error instanceof Error ? error.message : fallback;
  return res.status(500).json({ success: false, message, error: message });
};

router.get('/aws/connections', async (req: AuthRequest, res: Response) => {
  const context = getUserContext(req);
  if (!context) {
    return unauthorized(res);
  }

  try {
    const connections = await provisioningService.listAwsConnections(context.orgId);
    return res.json({ success: true, connections });
  } catch (error) {
    return serverError(res, 'Failed to load AWS connections', error);
  }
});

router.post('/aws/connections', async (req: AuthRequest, res: Response) => {
  const context = getUserContext(req);
  if (!context) {
    return unauthorized(res);
  }

  try {
    const connection = await provisioningService.upsertAwsConnection(context.orgId, context.userId, {
      name: String(req.body?.name || 'default-aws'),
      accountId: String(req.body?.accountId || ''),
      region: String(req.body?.region || ''),
      roleArn: String(req.body?.roleArn || ''),
      externalId: req.body?.externalId ? String(req.body.externalId) : undefined,
    });
    return res.status(201).json({ success: true, connection });
  } catch (error) {
    return serverError(res, 'Failed to save AWS connection', error);
  }
});

router.get('/jobs', async (req: AuthRequest, res: Response) => {
  const context = getUserContext(req);
  if (!context) {
    return unauthorized(res);
  }

  try {
    const jobs = await provisioningService.listProvisioningJobs(context.orgId);
    return res.json({ success: true, jobs });
  } catch (error) {
    return serverError(res, 'Failed to load provisioning jobs', error);
  }
});

router.post('/jobs', async (req: AuthRequest, res: Response) => {
  const context = getUserContext(req);
  if (!context) {
    return unauthorized(res);
  }

  try {
    const job = await provisioningService.createProvisioningJob(context.orgId, context.userId, {
      awsConnectionId: String(req.body?.awsConnectionId || ''),
      source: req.body?.source === 'platform-template' ? 'platform-template' : 'user-terraform',
      modules: Array.isArray(req.body?.modules) ? req.body.modules : [],
    });
    return res.status(201).json({ success: true, job });
  } catch (error) {
    return serverError(res, 'Failed to create provisioning job', error);
  }
});

router.get('/jobs/:jobId', async (req: AuthRequest, res: Response) => {
  const context = getUserContext(req);
  if (!context) {
    return unauthorized(res);
  }

  try {
    const job = await provisioningService.getProvisioningJob(context.orgId, req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Provisioning job not found', error: 'Provisioning job not found' });
    }
    return res.json({ success: true, job });
  } catch (error) {
    return serverError(res, 'Failed to load provisioning job', error);
  }
});

router.post('/jobs/:jobId/plan', async (req: AuthRequest, res: Response) => {
  const context = getUserContext(req);
  if (!context) {
    return unauthorized(res);
  }

  try {
    const job = await provisioningService.planProvisioningJob(context.orgId, context.userId, req.params.jobId);
    return res.json({ success: true, job });
  } catch (error) {
    return serverError(res, 'Failed to run terraform plan', error);
  }
});

router.post('/jobs/:jobId/apply', async (req: AuthRequest, res: Response) => {
  const context = getUserContext(req);
  if (!context) {
    return unauthorized(res);
  }

  try {
    const job = await provisioningService.applyProvisioningJob(
      context.orgId,
      context.userId,
      req.params.jobId,
      req.body?.approved === true
    );
    return res.json({ success: true, job });
  } catch (error) {
    return serverError(res, 'Failed to run terraform apply', error);
  }
});

export default router;
