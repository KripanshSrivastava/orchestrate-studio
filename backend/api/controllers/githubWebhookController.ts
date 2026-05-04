import crypto from 'node:crypto';
import { Request, Response } from 'express';

import {
  getGithubWebhookHealth,
  processGithubPushEvent,
  ParsedGithubPushEvent,
} from '../../services/integrations/githubWebhookService.js';
import { updateExecutionRun } from '../../services/workflow/workflowExecutionService.js';

interface GithubPushPayload {
  ref?: string;
  repository?: {
    full_name?: string;
    name?: string;
  };
  head_commit?: {
    id?: string;
    committer?: {
      name?: string;
      username?: string;
    };
  };
  pusher?: {
    name?: string;
  };
}

type WorkflowRunPayload = {
  workflow_run?: {
    id?: number;
    status?: string;
    conclusion?: string | null;
    inputs?: Record<string, string | number | null>;
  };
};

const mapWorkflowStatus = (status?: string, conclusion?: string | null): string => {
  if (status === 'in_progress') {
    return 'running';
  }

  if (status === 'completed') {
    return conclusion === 'success' ? 'success' : 'failed';
  }

  return 'pending';
};

const getRunIdFromInputs = (inputs?: Record<string, string | number | null>): string | null => {
  if (!inputs) return null;
  const value = inputs.runId ?? inputs.run_id;
  if (value === undefined || value === null) return null;
  return String(value).trim() || null;
};

const getSignature = (req: Request): string => req.header('x-hub-signature-256') || '';

const isValidSignature = (secret: string, payloadBuffer: Buffer, signatureHeader: string): boolean => {
  if (!signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(payloadBuffer).digest('hex')}`;
  const actual = signatureHeader;

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

const parsePushPayload = (event: string, payload: GithubPushPayload): ParsedGithubPushEvent | null => {
  const ref = payload.ref || '';
  const branch = ref.replace('refs/heads/', '');
  const commitSha = payload.head_commit?.id || '';
  const committer = payload.head_commit?.committer?.name || payload.head_commit?.committer?.username || payload.pusher?.name || 'unknown';
  const repoName = payload.repository?.full_name || payload.repository?.name || 'unknown';

  if (!branch || !commitSha || !repoName) {
    return null;
  }

  return {
    event,
    branch,
    commitSha,
    committer,
    repoName,
    payload: payload as Record<string, unknown>,
  };
};

export const handleGithubWebhook = async (req: Request, res: Response) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    res.status(500).json({ success: false, error: 'GITHUB_WEBHOOK_SECRET is not configured' });
    return;
  }

  const signature = getSignature(req);
  const payloadBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

  if (!payloadBuffer.length) {
    res.status(400).json({ success: false, error: 'Expected raw JSON body' });
    return;
  }

  if (!isValidSignature(secret, payloadBuffer, signature)) {
    res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    return;
  }

  let payload: GithubPushPayload;
  try {
    payload = JSON.parse(payloadBuffer.toString('utf-8')) as GithubPushPayload;
  } catch (_error) {
    res.status(400).json({ success: false, error: 'Invalid JSON payload' });
    return;
  }

  const eventName = req.header('x-github-event') || 'unknown';
  if (eventName === 'workflow_run') {
    const workflowPayload = payload as WorkflowRunPayload;
    console.log('[github-webhook] Received workflow_run event. Status:', workflowPayload.workflow_run?.status, 'Conclusion:', workflowPayload.workflow_run?.conclusion);

    const runId = getRunIdFromInputs(workflowPayload.workflow_run?.inputs);

    if (!runId) {
      console.warn('[github-webhook] Missing runId input in workflow_run payload');
      res.status(200).json({ success: true, accepted: true, ignored: true, reason: 'Missing runId input' });
      return;
    }

    const status = mapWorkflowStatus(
      workflowPayload.workflow_run?.status,
      workflowPayload.workflow_run?.conclusion ?? null
    );
    const finishedAt = workflowPayload.workflow_run?.status === 'completed'
      ? new Date().toISOString()
      : null;

    try {
      const updated = await updateExecutionRun(runId, {
        status,
        finished_at: finishedAt,
        error: status === 'failed'
          ? `Workflow concluded: ${workflowPayload.workflow_run?.conclusion ?? 'failure'}`
          : null,
      });
      console.log(`[github-webhook] Updated execution_runs row ${runId} to status: ${updated.status}`);
    } catch (error) {
      console.error('[github-webhook] failed to update execution run:', error);
      res.status(200).json({ success: true, accepted: true, ignored: true, reason: 'Run not found' });
      return;
    }

    res.status(200).json({ success: true, accepted: true });
    return;
  }

  if (eventName !== 'push') {
    res.status(200).json({ success: true, accepted: true, ignored: true, reason: 'Non-push event' });
    return;
  }

  const parsed = parsePushPayload(eventName, payload);
  if (!parsed) {
    res.status(400).json({ success: false, error: 'Invalid push payload shape' });
    return;
  }

  if (parsed.branch !== 'main') {
    res.status(200).json({ success: true, accepted: true, ignored: true, reason: 'Branch is not main' });
    return;
  }

  res.status(200).json({ success: true, accepted: true });

  setImmediate(() => {
    void processGithubPushEvent(parsed).catch((error) => {
      console.error('[github-webhook] async processing failed:', error);
    });
  });
};

export const githubWebhookHealth = async (_req: Request, res: Response) => {
  try {
    const health = await getGithubWebhookHealth();
    res.status(health.healthy ? 200 : 503).json({ success: health.healthy, data: health });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to evaluate webhook health',
    });
  }
};
