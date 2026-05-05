BEGIN;

CREATE TABLE IF NOT EXISTS github_webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  repo_full_name VARCHAR(255) NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['push', 'workflow_run'],
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repo_full_name)
);

CREATE INDEX IF NOT EXISTS idx_github_webhook_configs_repo
  ON github_webhook_configs(repo_full_name);

COMMIT;
