BEGIN;

CREATE TABLE IF NOT EXISTS ec2_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(255) NOT NULL DEFAULT 'default',
  instance_id VARCHAR(255),
  public_ip VARCHAR(255),
  region VARCHAR(100) NOT NULL,
  instance_type VARCHAR(100) NOT NULL,
  disk_size INTEGER NOT NULL,
  app_port INTEGER NOT NULL,
  ssh_user VARCHAR(100) NOT NULL DEFAULT 'ubuntu',
  status VARCHAR(50) NOT NULL DEFAULT 'running',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
