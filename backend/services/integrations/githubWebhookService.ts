import { query } from '../../database/pool.js';
import { setJsonWithTtl, getRedisHealth } from '../cache/redisClient.js';
import { emitNodeStatusUpdate, emitPipelineCreated } from '../realtime/socketServer.js';
import { enqueueDlqJob, enqueuePipelineRunJob, getQueueHealth } from '../queue/queueClient.js';

export interface ParsedGithubPushEvent {
  event: string;
  repoName: string;
  branch: string;
  commitSha: string;
  committer: string;
  payload: Record<string, unknown>;
}

export interface GithubWebhookHealth {
  integration: 'github-webhook';
  healthy: boolean;
  redis: { connected: boolean; error?: string };
  queue: { healthy: boolean; error?: string };
  lastProcessedAt: string | null;
  lastError: string | null;
}

let lastProcessedAt: string | null = null;
let lastError: string | null = null;

const insertPipelineRun = async (orgId: string, event: ParsedGithubPushEvent) => {
  const result = await query<{ id: string }>(
    `
      INSERT INTO pipeline_runs (
        org_id,
        source,
        repo_name,
        branch,
        commit_sha,
        committer,
        status,
        metadata
      )
      VALUES ($1, 'github', $2, $3, $4, $5, 'queued', $6::jsonb)
      RETURNING id
    `,
    [
      orgId,
      event.repoName,
      event.branch,
      event.commitSha,
      event.committer,
      JSON.stringify({ event: event.event }),
    ]
  );

  return result.rows[0]?.id;
};

const insertAuditLog = async (
  pipelineId: string | null,
  action: string,
  result: 'success' | 'failed',
  durationMs: number,
  details: Record<string, unknown>
) => {
  await query(
    `
      INSERT INTO pipeline_audit_logs (
        pipeline_id,
        node_type,
        action,
        result,
        duration_ms,
        details
      )
      VALUES ($1, 'github', $2, $3, $4, $5::jsonb)
    `,
    [pipelineId, action, result, durationMs, JSON.stringify(details)]
  );
};

export const processGithubPushEvent = async (parsed: ParsedGithubPushEvent) => {
  const startedAt = Date.now();
  const orgId = process.env.DEFAULT_ORG_ID || 'default-org';
  let pipelineId: string | null = null;

  try {
    pipelineId = await insertPipelineRun(orgId, parsed) ?? null;

    await setJsonWithTtl(`webhook:${parsed.commitSha}`, parsed.payload, 60 * 60);

    if (pipelineId) {
      await enqueuePipelineRunJob({
        pipelineRunId: pipelineId,
        repoName: parsed.repoName,
        branch: parsed.branch,
        commitSha: parsed.commitSha,
        committer: parsed.committer,
        webhookEvent: parsed.event,
      });
    }

    emitPipelineCreated({
      pipelineId,
      repoName: parsed.repoName,
      branch: parsed.branch,
      commitSha: parsed.commitSha,
      committer: parsed.committer,
      status: 'queued',
      source: 'github-webhook',
      createdAt: new Date().toISOString(),
    });

    emitNodeStatusUpdate({
      nodeId: 'github',
      status: 'success',
      message: `Webhook accepted for ${parsed.repoName}@${parsed.branch}`,
      timestamp: new Date().toISOString(),
      metadata: {
        pipelineId,
        commitSha: parsed.commitSha,
        committer: parsed.committer,
      },
    });

    await insertAuditLog(
      pipelineId,
      'github_webhook_processed',
      'success',
      Date.now() - startedAt,
      {
        repoName: parsed.repoName,
        branch: parsed.branch,
        commitSha: parsed.commitSha,
      }
    );

    lastProcessedAt = new Date().toISOString();
    lastError = null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown github webhook processing failure';

    await enqueueDlqJob({
      integration: 'github-webhook',
      pipelineId,
      commitSha: parsed.commitSha,
      branch: parsed.branch,
      repoName: parsed.repoName,
      error: message,
      occurredAt: new Date().toISOString(),
      payload: parsed.payload,
    });

    emitNodeStatusUpdate({
      nodeId: 'github',
      status: 'failed',
      message: message,
      timestamp: new Date().toISOString(),
      metadata: {
        pipelineId,
        commitSha: parsed.commitSha,
      },
    });

    await insertAuditLog(
      pipelineId,
      'github_webhook_processed',
      'failed',
      Date.now() - startedAt,
      {
        repoName: parsed.repoName,
        branch: parsed.branch,
        commitSha: parsed.commitSha,
        error: message,
      }
    );

    lastError = message;
    throw error;
  }
};

export const getGithubWebhookHealth = async (): Promise<GithubWebhookHealth> => {
  const [redis, queue] = await Promise.all([
    getRedisHealth(),
    getQueueHealth(),
  ]);

  return {
    integration: 'github-webhook',
    healthy: redis.connected && queue.healthy,
    redis,
    queue,
    lastProcessedAt,
    lastError,
  };
};
