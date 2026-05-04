BEGIN;

CREATE TABLE IF NOT EXISTS application_runtime_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL,
  application_name VARCHAR(255) NOT NULL,
  environment VARCHAR(50) NOT NULL DEFAULT 'prod',
  version VARCHAR(100) NOT NULL DEFAULT 'v1.0.0',
  runtime_status VARCHAR(50) NOT NULL DEFAULT 'running',
  cpu_percent INTEGER NOT NULL DEFAULT 0,
  memory_percent INTEGER NOT NULL DEFAULT 0,
  replicas VARCHAR(30) NOT NULL DEFAULT '1/1',
  last_deploy_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_application_runtime_org_name UNIQUE (org_id, application_name)
);

CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  environment VARCHAR(50) NOT NULL,
  version VARCHAR(100) NOT NULL,
  rollout_status VARCHAR(50) NOT NULL DEFAULT 'healthy',
  strategy VARCHAR(50) NOT NULL DEFAULT 'rolling',
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_time TIMESTAMPTZ NOT NULL,
  value NUMERIC(12, 2) NOT NULL,
  secondary_value NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  log_level VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS infrastructure_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  region VARCHAR(100) NOT NULL,
  nodes INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'healthy',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_infra_resources_org_name UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS terraform_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'applied',
  resource_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  drift BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_terraform_modules_org_name UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS hpa_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  min_replicas INTEGER NOT NULL,
  max_replicas INTEGER NOT NULL,
  current_replicas INTEGER NOT NULL,
  target_cpu INTEGER NOT NULL,
  current_cpu INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hpa_configs_org_service UNIQUE (org_id, service_name)
);

CREATE INDEX IF NOT EXISTS idx_app_runtime_org_status ON application_runtime_status(org_id, runtime_status);
CREATE INDEX IF NOT EXISTS idx_deployments_org_deployed_at ON deployments(org_id, deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_metrics_org_name_time ON service_metrics(org_id, metric_name, metric_time);
CREATE INDEX IF NOT EXISTS idx_service_logs_org_logged_at ON service_logs(org_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_infra_resources_org_status ON infrastructure_resources(org_id, status);
CREATE INDEX IF NOT EXISTS idx_terraform_modules_org_drift ON terraform_modules(org_id, drift);

COMMIT;
