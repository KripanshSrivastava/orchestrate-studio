import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { requireTenantContext } from '../../middleware/tenantMiddleware.js';
import { query } from '../../database/pool.js';

const router = Router();

router.use(requireTenantContext);

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60_000);
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60_000);

const seedOperationalData = async (orgId: string): Promise<void> => {
  const existing = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM applications WHERE org_id = $1', [orgId]);
  if (Number(existing.rows[0]?.count || 0) > 0) {
    return;
  }

  const apps = [
    ['api-gateway', 'North-south API gateway', 'active', 'prod', 'v2.4.1', 'running', 42, 68, '3/3', minutesAgo(5)],
    ['user-service', 'Identity profile API', 'active', 'prod', 'v1.8.0', 'running', 28, 55, '2/2', hoursAgo(2)],
    ['payment-svc', 'Payment processing service', 'active', 'prod', 'v3.1.2', 'error', 85, 91, '1/3', minutesAgo(28)],
    ['notification', 'Email and webhook delivery', 'active', 'stage', 'v0.9.4', 'deploying', 15, 32, '2/2', minutesAgo(1)],
    ['auth-service', 'Authentication broker', 'active', 'prod', 'v2.0.0', 'running', 35, 48, '3/3', daysAgo(1)],
    ['order-service', 'Order orchestration API', 'active', 'prod', 'v1.5.3', 'running', 52, 63, '4/4', hoursAgo(3)],
  ];

  for (const app of apps) {
    await query(
      `INSERT INTO applications (org_id, name, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (org_id, name) DO NOTHING`,
      [orgId, app[0], app[1], app[2]]
    );
    await query(
      `INSERT INTO application_runtime_status (
        org_id, application_name, environment, version, runtime_status, cpu_percent, memory_percent, replicas, last_deploy_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (org_id, application_name) DO NOTHING`,
      [orgId, app[0], app[3], app[4], app[5], app[6], app[7], app[8], app[9]]
    );
  }

  const pipelineRuns = [
    ['github', 'orchestrate-studio', 'main', '9f4a2c1', 'Kripansh', 'running', { name: 'Orcestra Demo Pipeline', stage: 'security-scan', duration: '6m 12s' }],
    ['github', 'api-gateway', 'release/v2.4', 'c81a0fe', 'platform-bot', 'success', { name: 'api-gateway-ci', stage: 'complete', duration: '9m 44s' }],
    ['github', 'payment-svc', 'main', '0df93ab', 'platform-bot', 'failed', { name: 'payment-svc-release', stage: 'deploy-prod', duration: '14m 02s' }],
    ['github', 'web-console', 'feat/docs', 'ac9311e', 'Kripansh', 'queued', { name: 'frontend-preview', stage: 'waiting', duration: '-' }],
  ];
  for (const run of pipelineRuns) {
    await query(
      `INSERT INTO pipeline_runs (org_id, source, repo_name, branch, commit_sha, committer, status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())`,
      [orgId, run[0], run[1], run[2], run[3], run[4], run[5], JSON.stringify(run[6])]
    );
  }

  const deployments = [
    ['api-gateway', 'prod', 'v2.4.1', 'healthy', 'rolling', true, minutesAgo(5)],
    ['user-service', 'stage', 'v1.8.0', 'progressing', 'canary', true, minutesAgo(12)],
    ['payment-svc', 'prod', 'v3.1.2', 'failed', 'blue-green', false, minutesAgo(28)],
    ['notification', 'dev', 'v0.9.4', 'healthy', 'rolling', true, hoursAgo(1)],
  ];
  for (const deployment of deployments) {
    await query(
      `INSERT INTO deployments (org_id, service_name, environment, version, rollout_status, strategy, approved, deployed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [orgId, ...deployment]
    );
  }

  const metricNames = ['request_rate', 'error_rate', 'latency'];
  for (let i = 0; i < 60; i += 1) {
    const metricTime = minutesAgo(59 - i);
    await query(
      `INSERT INTO service_metrics (org_id, metric_name, metric_time, value, secondary_value)
       VALUES ($1, $2, $3, $4, $5), ($1, $6, $3, $7, $8), ($1, $9, $3, $10, $11)`,
      [
        orgId,
        metricNames[0],
        metricTime,
        820 + (i % 12) * 26,
        null,
        metricNames[1],
        i === 32 ? 8.4 : 0.6 + (i % 5) * 0.3,
        null,
        metricNames[2],
        34 + (i % 8) * 3,
        88 + (i % 10) * 7,
      ]
    );
  }

  const logs = [
    ['api-gateway', 'info', 'GET /api/v1/users 200 - 42ms', minutesAgo(1)],
    ['payment-svc', 'warn', 'Retry attempt 2/3 for payment processing', minutesAgo(2)],
    ['payment-svc', 'error', 'Connection timeout to stripe API after 30000ms', minutesAgo(3)],
    ['auth-service', 'info', 'Token refresh successful for user session', minutesAgo(4)],
    ['order-service', 'info', 'Order #12847 created successfully', minutesAgo(5)],
    ['notification', 'warn', 'Email queue depth exceeding threshold: 150/100', minutesAgo(6)],
  ];
  for (const log of logs) {
    await query(
      'INSERT INTO service_logs (org_id, service_name, log_level, message, logged_at) VALUES ($1, $2, $3, $4, $5)',
      [orgId, ...log]
    );
  }

  const alerts = [
    ['High CPU usage on payment-svc', 'open', 'critical', 'payment-svc is above 85% CPU for 10 minutes', 'prometheus', 'payment-svc', minutesAgo(5)],
    ['Error rate spike on api-gateway', 'open', 'warning', 'api-gateway error rate exceeded 2%', 'prometheus', 'api-gateway', minutesAgo(12)],
    ['Disk usage > 85% on rds-prod', 'acknowledged', 'warning', 'Primary database disk usage crossed threshold', 'prometheus', 'rds-prod', hoursAgo(1)],
    ['Certificate expiring in 7 days', 'open', 'info', 'Ingress certificate expires soon', 'alertmanager', 'ingress-prod', hoursAgo(2)],
  ];
  for (const alert of alerts) {
    await query(
      `INSERT INTO alerts (org_id, name, status, severity, message, source, source_ref, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (org_id, name) DO NOTHING`,
      [orgId, ...alert]
    );
  }

  const vulns = [
    ['SQL Injection in user-service', 'critical', 'open', null, 'Unsanitized query parameter reaches SQL builder', 'SAST', 'src/db/queries.ts:42'],
    ['CVE-2024-3094 in xz-utils', 'critical', 'open', 'CVE-2024-3094', 'Compromised xz-utils package found in image layer', 'Container', 'api-gateway:latest'],
    ['Hardcoded API key detected', 'high', 'open', null, 'Potential secret committed in source code', 'SAST', 'src/config/stripe.ts:8'],
    ['Container running as root', 'high', 'in_progress', null, 'Dockerfile does not set non-root user', 'Policy', 'payment-svc/Dockerfile'],
  ];
  for (const vuln of vulns) {
    await query(
      `INSERT INTO vulnerabilities (org_id, name, severity, status, cve_id, description, resource_type, resource_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (org_id, name) DO NOTHING`,
      [orgId, ...vuln]
    );
  }

  const infra = [
    ['k8s-prod-cluster', 'Kubernetes', 'AWS EKS', 'us-east-1', 6, 'healthy'],
    ['k8s-stage-cluster', 'Kubernetes', 'AWS EKS', 'us-east-1', 3, 'healthy'],
    ['rds-prod-primary', 'RDS PostgreSQL', 'AWS', 'us-east-1', 2, 'healthy'],
    ['redis-prod', 'ElastiCache', 'AWS', 'us-east-1', 3, 'healthy'],
    ['cdn-global', 'CloudFront', 'AWS', 'Global', 1, 'degraded'],
  ];
  for (const item of infra) {
    await query(
      `INSERT INTO infrastructure_resources (org_id, name, resource_type, provider, region, nodes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (org_id, name) DO NOTHING`,
      [orgId, ...item]
    );
  }

  const modules = [
    ['vpc-production', 'applied', 24, hoursAgo(2), false],
    ['eks-cluster', 'applied', 42, daysAgo(1), false],
    ['rds-databases', 'applied', 8, daysAgo(3), true],
    ['monitoring-stack', 'planning', 15, minutesAgo(5), false],
  ];
  for (const module of modules) {
    await query(
      `INSERT INTO terraform_modules (org_id, name, status, resource_count, last_run_at, drift)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (org_id, name) DO NOTHING`,
      [orgId, ...module]
    );
  }

  const hpas = [
    ['api-gateway', 2, 10, 3, 70, 42],
    ['user-service', 2, 6, 2, 75, 28],
    ['order-service', 3, 12, 4, 65, 52],
    ['payment-svc', 2, 8, 3, 60, 85],
  ];
  for (const hpa of hpas) {
    await query(
      `INSERT INTO hpa_configs (org_id, service_name, min_replicas, max_replicas, current_replicas, target_cpu, current_cpu)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (org_id, service_name) DO NOTHING`,
      [orgId, ...hpa]
    );
  }
};

const ok = (res: Response, data: unknown) => res.json({ success: true, data });

router.get('/snapshot', async (req: AuthRequest, res: Response) => {
  const orgId = req.tenantContext?.org_id;
  if (!orgId) {
    return res.status(403).json({ success: false, message: 'Missing tenant context' });
  }

  try {
    await seedOperationalData(orgId);

    const [
      applications,
      pipelines,
      deployments,
      metrics,
      logs,
      alerts,
      vulnerabilities,
      infrastructure,
      terraform,
      hpa,
    ] = await Promise.all([
      query(
        `SELECT a.id, a.name, a.description, a.status,
          COALESCE(r.environment, 'prod') AS env,
          COALESCE(r.version, 'v1.0.0') AS version,
          COALESCE(r.runtime_status, a.status) AS runtime_status,
          COALESCE(r.cpu_percent, 0) AS cpu,
          COALESCE(r.memory_percent, 0) AS memory,
          COALESCE(r.replicas, '1/1') AS replicas,
          COALESCE(r.last_deploy_at, a.updated_at) AS last_deploy_at
         FROM applications a
         LEFT JOIN application_runtime_status r ON r.org_id = a.org_id AND r.application_name = a.name
         WHERE a.org_id = $1
         ORDER BY a.created_at DESC`,
        [orgId]
      ),
      query(
        `SELECT id, repo_name, branch, commit_sha, committer, status, metadata, created_at, updated_at
         FROM pipeline_runs WHERE org_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [orgId]
      ),
      query('SELECT * FROM deployments WHERE org_id = $1 ORDER BY deployed_at DESC LIMIT 50', [orgId]),
      query(
        `SELECT metric_name, metric_time, value, secondary_value
         FROM service_metrics WHERE org_id = $1 ORDER BY metric_time ASC`,
        [orgId]
      ),
      query('SELECT * FROM service_logs WHERE org_id = $1 ORDER BY logged_at DESC LIMIT 100', [orgId]),
      query('SELECT * FROM alerts WHERE org_id = $1 ORDER BY created_at DESC LIMIT 100', [orgId]),
      query('SELECT * FROM vulnerabilities WHERE org_id = $1 ORDER BY detected_at DESC LIMIT 100', [orgId]),
      query('SELECT * FROM infrastructure_resources WHERE org_id = $1 ORDER BY name ASC', [orgId]),
      query('SELECT * FROM terraform_modules WHERE org_id = $1 ORDER BY name ASC', [orgId]),
      query('SELECT * FROM hpa_configs WHERE org_id = $1 ORDER BY service_name ASC', [orgId]),
    ]);

    return ok(res, {
      applications: applications.rows,
      pipelines: pipelines.rows,
      deployments: deployments.rows,
      metrics: metrics.rows,
      logs: logs.rows,
      alerts: alerts.rows,
      vulnerabilities: vulnerabilities.rows,
      infrastructure: infrastructure.rows,
      terraformModules: terraform.rows,
      hpaConfigs: hpa.rows,
      generatedAt: new Date().toISOString(),
      requestId: randomUUID(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load platform snapshot';
    return res.status(500).json({ success: false, message, error: message });
  }
});

router.post('/actions/:resource/:id', async (req: AuthRequest, res: Response) => {
  const orgId = req.tenantContext?.org_id;
  const { resource, id } = req.params;
  const action = String(req.body?.action || '');

  if (!orgId) {
    return res.status(403).json({ success: false, message: 'Missing tenant context' });
  }

  try {
    if (resource === 'alerts' && action === 'acknowledge') {
      await query('UPDATE alerts SET status = $1 WHERE org_id = $2 AND id = $3', ['acknowledged', orgId, id]);
      return ok(res, { updated: true });
    }

    if (resource === 'vulnerabilities' && action === 'resolve') {
      await query('UPDATE vulnerabilities SET status = $1, resolved_at = NOW(), updated_at = NOW() WHERE org_id = $2 AND id = $3', ['resolved', orgId, id]);
      return ok(res, { updated: true });
    }

    if (resource === 'terraform' && action === 'reconcile') {
      await query('UPDATE terraform_modules SET drift = false, last_run_at = NOW(), updated_at = NOW() WHERE org_id = $1 AND id = $2', [orgId, id]);
      return ok(res, { updated: true });
    }

    return res.status(400).json({ success: false, message: 'Unsupported platform action' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run platform action';
    return res.status(500).json({ success: false, message, error: message });
  }
});

export default router;
