BEGIN;

CREATE TABLE IF NOT EXISTS aws_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_id VARCHAR(32) NOT NULL,
  region VARCHAR(100) NOT NULL,
  role_arn TEXT NOT NULL,
  secret_ref TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'configured',
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_aws_connections_org_name UNIQUE (org_id, name),
  CONSTRAINT chk_aws_connections_status CHECK (status IN ('configured', 'verified', 'failed', 'disabled'))
);

CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  aws_connection_id UUID REFERENCES aws_connections(id) ON DELETE SET NULL,
  source VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  approval_status VARCHAR(50) NOT NULL DEFAULT 'not_requested',
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_log TEXT,
  apply_log TEXT,
  plan_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  planned_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  CONSTRAINT chk_provisioning_jobs_source CHECK (source IN ('platform-template', 'user-terraform')),
  CONSTRAINT chk_provisioning_jobs_status CHECK (status IN ('draft', 'planning', 'planned', 'plan_failed', 'awaiting_approval', 'applying', 'applied', 'apply_failed', 'cancelled')),
  CONSTRAINT chk_provisioning_jobs_approval CHECK (approval_status IN ('not_requested', 'required', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_aws_connections_org_user ON aws_connections(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_org_created ON provisioning_jobs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_aws_connection ON provisioning_jobs(aws_connection_id);

COMMIT;
