/**
 * Multi-Tenant Database Schema Definitions
 * Documents required org_id columns for all entities
 * Use these migrations to update your database
 */

/**
 * MIGRATION: Add org_id to all tables
 * Must run before deploying multi-tenant code
 */

export const multiTenantMigrations = `

-- ============================================================================
-- CRITICAL: Add org_id column to ALL existing tables
-- This enables multi-tenant isolation
-- ============================================================================

-- 1. Applications table
ALTER TABLE applications ADD COLUMN org_id VARCHAR(255) NOT NULL DEFAULT 'default-org';
CREATE INDEX idx_applications_org_id ON applications(org_id);
CREATE UNIQUE INDEX idx_applications_org_id_name ON applications(org_id, name);

-- 2. Workflows table
ALTER TABLE workflows ADD COLUMN org_id VARCHAR(255) NOT NULL DEFAULT 'default-org';
CREATE INDEX idx_workflows_org_id ON workflows(org_id);
CREATE UNIQUE INDEX idx_workflows_org_id_name ON workflows(org_id, name);

-- 3. Executions table
ALTER TABLE executions ADD COLUMN org_id VARCHAR(255) NOT NULL DEFAULT 'default-org';
CREATE INDEX idx_executions_org_id ON executions(org_id);
CREATE INDEX idx_executions_org_id_workflow_id ON executions(org_id, workflow_id);

-- 4. Integrations table (user integration secrets)
ALTER TABLE integrations ADD COLUMN org_id VARCHAR(255) NOT NULL DEFAULT 'default-org';
CREATE INDEX idx_integrations_org_id ON integrations(org_id);
CREATE INDEX idx_integrations_org_id_user_id ON integrations(org_id, user_id);

-- 5. Deployments table
ALTER TABLE deployments ADD COLUMN org_id VARCHAR(255) NOT NULL DEFAULT 'default-org';
CREATE INDEX idx_deployments_org_id ON deployments(org_id);
CREATE INDEX idx_deployments_org_id_application_id ON deployments(org_id, application_id);

-- 6. Pipeline Runs table
ALTER TABLE pipeline_runs ADD COLUMN org_id VARCHAR(255) NOT NULL DEFAULT 'default-org';
CREATE INDEX idx_pipeline_runs_org_id ON pipeline_runs(org_id);
CREATE INDEX idx_pipeline_runs_org_id_pipeline_id ON pipeline_runs(org_id, pipeline_id);

-- 7. Audit Logs table (already has org_id in code, verify in DB)
ALTER TABLE audit_logs ADD COLUMN org_id VARCHAR(255) NOT NULL DEFAULT 'default-org';
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_org_id_user_id ON audit_logs(org_id, user_id);

-- 8. Settings/Configuration table
ALTER TABLE settings ADD COLUMN org_id VARCHAR(255) NOT NULL DEFAULT 'default-org';
CREATE UNIQUE INDEX idx_settings_org_id_key ON settings(org_id, key);

-- 9. Add foreign key constraints (if using relational DB)
ALTER TABLE applications ADD CONSTRAINT fk_applications_org_id 
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE workflows ADD CONSTRAINT fk_workflows_org_id 
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE executions ADD CONSTRAINT fk_executions_org_id 
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================================================
-- Add organizations reference table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name)
);

-- Create sample orgs for testing
INSERT INTO organizations (id, name) VALUES 
  ('org-acme', 'ACME Team'),
  ('org-beta', 'Beta Team'),
  ('org-gamma', 'Gamma Team')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION: All queries must include org_id filter
-- ============================================================================

-- WRONG (will fail with BaseRepository):
-- SELECT * FROM applications WHERE id = 'app-1';

-- RIGHT (enforced by BaseRepository):
-- SELECT * FROM applications WHERE id = 'app-1' AND org_id = 'org-acme';

-- ============================================================================
-- Row-Level Security (Optional: PostgreSQL)
-- ============================================================================

-- Enable RLS on critical tables
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (if using session-based org_id)
-- CREATE POLICY org_isolation ON applications
--   USING (org_id = current_setting('app.org_id')::TEXT);
`;

/**
 * TypeScript entity types with org_id
 */

export interface Application {
  id: string;
  org_id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'archived';
  created_at: Date;
  updated_at: Date;
}

export interface Workflow {
  id: string;
  org_id: string;
  application_id: string;
  name: string;
  description: string;
  dag: Record<string, any>;
  status: 'draft' | 'published' | 'deprecated';
  created_at: Date;
  updated_at: Date;
}

export interface Execution {
  id: string;
  org_id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  started_at: Date;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Integration {
  id: string;
  org_id: string;
  user_id: string;
  provider: string;
  credentials: Record<string, string>;
  created_at: Date;
  updated_at: Date;
}

export interface Deployment {
  id: string;
  org_id: string;
  application_id: string;
  version: string;
  environment: 'dev' | 'staging' | 'prod';
  status: 'pending' | 'in-progress' | 'success' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export default {
  multiTenantMigrations,
};
