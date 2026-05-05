import { query } from '../../database/pool.js';

export interface GithubWebhookConfigValues {
  repository: string;
  secret: string;
  events?: string;
}

interface GithubWebhookConfigRecord {
  id: string;
  user_id: string;
  repo_full_name: string;
  secret: string;
  events: string[];
  active: boolean;
  updated_at: string | Date;
}

export const parseGithubWebhookEvents = (events: string | undefined): string[] => {
  const parsed = (events || 'push,workflow_run')
    .split(',')
    .map((event) => event.trim())
    .filter(Boolean);

  return Array.from(new Set(parsed.length > 0 ? parsed : ['push', 'workflow_run']));
};

export const normalizeGithubWebhookRepository = (repository: string): string => {
  const value = repository.trim().replace(/\.git$/i, '');
  const githubUrlMatch = value.match(/github\.com[:/]+([^/\s]+)\/([^/\s#?]+)/i);

  if (githubUrlMatch) {
    return `${githubUrlMatch[1]}/${githubUrlMatch[2]}`.toLowerCase();
  }

  return value.toLowerCase();
};

export const upsertGithubWebhookConfig = async (
  userId: string,
  values: GithubWebhookConfigValues
) => {
  const repoFullName = normalizeGithubWebhookRepository(values.repository);
  const secret = values.secret.trim();
  const events = parseGithubWebhookEvents(values.events);

  if (!repoFullName || !repoFullName.includes('/')) {
    throw new Error('Repository must be in owner/repo format.');
  }

  if (!secret) {
    throw new Error('Webhook secret is required.');
  }

  await query(
    `
    INSERT INTO github_webhook_configs (user_id, repo_full_name, secret, events, active, updated_at)
    VALUES ($1, $2, $3, $4, true, NOW())
    ON CONFLICT (repo_full_name)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      secret = EXCLUDED.secret,
      events = EXCLUDED.events,
      active = true,
      updated_at = NOW()
    `,
    [userId, repoFullName, secret, events]
  );
};

export const removeGithubWebhookConfig = async (userId: string, repository: string) => {
  const repoFullName = normalizeGithubWebhookRepository(repository);

  if (!repoFullName) {
    return;
  }

  await query(
    `
    UPDATE github_webhook_configs
    SET active = false, updated_at = NOW()
    WHERE user_id = $1 AND repo_full_name = $2
    `,
    [userId, repoFullName]
  );
};

export const getGithubWebhookConfigByRepository = async (repository: string) => {
  const repoFullName = normalizeGithubWebhookRepository(repository);
  if (!repoFullName) {
    return null;
  }

  const result = await query<GithubWebhookConfigRecord>(
    `
    SELECT id, user_id, repo_full_name, secret, events, active, updated_at
    FROM github_webhook_configs
    WHERE repo_full_name = $1 AND active = true
    `,
    [repoFullName]
  );

  return result.rows[0] || null;
};
