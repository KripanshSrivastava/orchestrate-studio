import { NextFunction, Request, Response } from 'express';

import { assertTenantContext } from '../../middleware/tenantMiddleware.js';
import applicationService from '../../services/application/ApplicationService.js';
import { getAllExecutionRuns } from '../../services/workflow/workflowExecutionService.js';

const STATUS_TO_RUNTIME: Record<string, 'running' | 'stopped' | 'deploying' | 'error'> = {
  active: 'running',
  inactive: 'stopped',
  archived: 'stopped',
  deleted: 'error',
  pending: 'deploying',
  queued: 'deploying',
  running: 'running',
  success: 'running',
  failed: 'error',
};

const buildApplicationSnapshot = async (req: Request) => {
  const tenantContext = assertTenantContext(req);
  const applicationsResult = await applicationService.listApplications(tenantContext, {
    page: 1,
    limit: 50,
    sortBy: 'created_at',
    sortDirection: 'DESC',
    includeDeleted: false,
  });

  return applicationsResult.items.map((application, index) => ({
    id: application.id,
    name: application.name,
    env: application.status === 'deleted' ? 'dev' : application.status === 'archived' ? 'stage' : 'prod',
    version: `v1.${index + 1}.0`,
    runtime_status: STATUS_TO_RUNTIME[application.status] || 'running',
    cpu: Math.min(95, 20 + index * 8),
    memory: Math.min(92, 30 + index * 6),
    replicas: application.status === 'deleted' ? '0/1' : '2/2',
    last_deploy_at: application.updated_at,
  }));
};

export const getPlatformSnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantContext = assertTenantContext(req);
    const [applications, runs] = await Promise.all([
      buildApplicationSnapshot(req),
      getAllExecutionRuns(),
    ]);

    const pipelineRuns = runs.map((run) => ({
      id: run.id,
      workflow_id: run.workflow_id,
      workflow_name: run.workflow_name || 'Workflow Run',
      status: run.status,
      input: run.input,
      output: run.output,
      error: run.error,
      started_at: run.started_at,
      finished_at: run.finished_at,
    }));

    const deployments = runs
      .filter((run) => run.status === 'success')
      .slice(0, 10)
      .map((run, index) => ({
        id: `${run.id}-deployment`,
        name: run.workflow_name || `Deployment ${index + 1}`,
        status: 'success',
        environment: String(run.input?.environment || 'prod'),
        version: `v${index + 1}.0.0`,
        finished_at: run.finished_at || run.started_at,
      }));

    const snapshot = {
      applications,
      pipelines: pipelineRuns,
      deployments,
      metrics: [
        { name: 'applications', value: applications.length },
        { name: 'pipelines', value: pipelineRuns.length },
        { name: 'deployments', value: deployments.length },
      ],
      logs: [],
      alerts: runs.filter((run) => run.status === 'failed').slice(0, 10).map((run) => ({
        id: run.id,
        message: run.error || `Workflow ${run.workflow_name || run.workflow_id} failed`,
        severity: 'warning',
        created_at: run.finished_at || run.started_at,
      })),
      vulnerabilities: [],
      infrastructure: [
        { name: 'k8s-prod-cluster', type: 'Kubernetes', provider: 'AWS EKS', region: 'us-east-1', nodes: 6, status: 'healthy' },
        { name: 'k8s-stage-cluster', type: 'Kubernetes', provider: 'AWS EKS', region: 'us-east-1', nodes: 3, status: 'healthy' },
        { name: 'rds-prod-primary', type: 'RDS PostgreSQL', provider: 'AWS', region: 'us-east-1', nodes: 2, status: 'healthy' },
        { name: 'redis-prod', type: 'ElastiCache', provider: 'AWS', region: 'us-east-1', nodes: 3, status: 'healthy' },
        { name: 'cdn-global', type: 'CloudFront', provider: 'AWS', region: 'Global', nodes: 1, status: 'degraded' },
      ],
      terraformModules: [
        { name: 'vpc-production', status: 'applied', resources: 24, lastRun: '2h ago', drift: false },
        { name: 'eks-cluster', status: 'applied', resources: 42, lastRun: '1d ago', drift: false },
        { name: 'rds-databases', status: 'applied', resources: 8, lastRun: '3d ago', drift: true },
        { name: 'monitoring-stack', status: 'planning', resources: 15, lastRun: '5m ago', drift: false },
      ],
      hpaConfigs: [
        { name: 'api-gateway', minReplicas: 2, maxReplicas: 10, currentReplicas: 3, targetCPU: 70, currentCPU: 42 },
        { name: 'user-service', minReplicas: 2, maxReplicas: 6, currentReplicas: 2, targetCPU: 75, currentCPU: 28 },
        { name: 'order-service', minReplicas: 3, maxReplicas: 12, currentReplicas: 4, targetCPU: 65, currentCPU: 52 },
        { name: 'payment-svc', minReplicas: 2, maxReplicas: 8, currentReplicas: 3, targetCPU: 60, currentCPU: 85 },
      ],
      generatedAt: new Date().toISOString(),
      tenant: tenantContext.org_id,
    };

    res.status(200).json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    next(error);
  }
};

export const performPlatformAction = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({
    success: false,
    message: 'Platform actions are not implemented yet',
  });
};