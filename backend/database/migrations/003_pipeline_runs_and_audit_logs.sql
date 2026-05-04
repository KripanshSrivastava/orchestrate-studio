BEGIN;

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL,
  source VARCHAR(100) NOT NULL DEFAULT 'github',
  repo_name VARCHAR(255) NOT NULL,
  branch VARCHAR(255) NOT NULL,
  commit_sha VARCHAR(64) NOT NULL,
  committer VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_pipeline_runs_status CHECK (status IN ('queued', 'running', 'success', 'failed', 'blocked'))
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_org_created_at
  ON pipeline_runs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_commit_sha
  ON pipeline_runs(commit_sha);

CREATE TABLE IF NOT EXISTS pipeline_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipeline_runs(id) ON DELETE SET NULL,
  node_type VARCHAR(100) NOT NULL,
  action VARCHAR(255) NOT NULL,
  result VARCHAR(50) NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_audit_logs_pipeline_created_at
  ON pipeline_audit_logs(pipeline_id, created_at DESC);

COMMIT;
