BEGIN;

CREATE TABLE IF NOT EXISTS api_idempotency_keys (
  id BIGSERIAL PRIMARY KEY,
  org_id VARCHAR(255) NOT NULL,
  scope VARCHAR(120) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  resource_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_api_idempotency_org_scope_key UNIQUE (org_id, scope, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_created_at
  ON api_idempotency_keys(created_at);

CREATE INDEX IF NOT EXISTS idx_applications_org_status_created_at
  ON applications(org_id, status, created_at DESC);

COMMIT;
