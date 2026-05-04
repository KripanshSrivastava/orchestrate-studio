import { randomUUID } from 'node:crypto';
import { query } from '../../database/pool.js';
import secretManagerService from '../secrets/secretManagerService.js';
import terraformRunnerService, { TerraformModuleInput } from './terraformRunnerService.js';

export interface AwsConnectionInput {
  name: string;
  accountId: string;
  region: string;
  roleArn: string;
  externalId?: string;
}

export interface ProvisioningJobInput {
  awsConnectionId: string;
  source: 'platform-template' | 'user-terraform';
  modules: TerraformModuleInput[];
}

const normalizeName = (value: string, fallback: string): string => {
  return value.trim() || fallback;
};

const requireValue = (value: string | undefined, label: string): string => {
  const normalized = (value || '').trim();
  if (!normalized) {
    throw new Error(`${label} is required`);
  }
  return normalized;
};

class ProvisioningService {
  async upsertAwsConnection(orgId: string, userId: string, input: AwsConnectionInput) {
    const name = normalizeName(input.name, 'default-aws');
    const accountId = requireValue(input.accountId, 'AWS account ID');
    const region = requireValue(input.region, 'AWS region');
    const roleArn = requireValue(input.roleArn, 'AWS role ARN');
    const externalId = input.externalId?.trim() || randomUUID();
    const connectionId = randomUUID();

    const secret = await secretManagerService.upsertAwsConnectionSecret(userId, connectionId, {
      externalId,
      roleArn,
      accountId,
      region,
    });

    const result = await query(
      `
        INSERT INTO aws_connections (id, org_id, user_id, name, account_id, region, role_arn, secret_ref, status, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'configured', NOW())
        ON CONFLICT (org_id, name)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          account_id = EXCLUDED.account_id,
          region = EXCLUDED.region,
          role_arn = EXCLUDED.role_arn,
          secret_ref = EXCLUDED.secret_ref,
          status = 'configured',
          updated_at = NOW()
        RETURNING id, org_id, user_id, name, account_id, region, role_arn, secret_ref, status, last_verified_at, created_at, updated_at
      `,
      [connectionId, orgId, userId, name, accountId, region, roleArn, secret.path]
    );

    return {
      ...result.rows[0],
      externalId,
    };
  }

  async listAwsConnections(orgId: string) {
    const result = await query(
      `
        SELECT id, org_id, user_id, name, account_id, region, role_arn, secret_ref, status, last_verified_at, created_at, updated_at
        FROM aws_connections
        WHERE org_id = $1
        ORDER BY updated_at DESC
      `,
      [orgId]
    );

    return result.rows;
  }

  async createProvisioningJob(orgId: string, userId: string, input: ProvisioningJobInput) {
    let modules = Array.isArray(input.modules)
      ? input.modules.filter((module) => module.name?.trim() && module.code?.trim())
      : [];

    if (input.source === 'platform-template' && modules.length === 0) {
      modules = [
        {
          name: 'platform-template',
          description: 'Placeholder for managed platform Terraform templates',
          code: '# Managed platform template placeholder. Real templates will be expanded by the provisioning service.\n',
        },
      ];
    }

    if (modules.length === 0) {
      throw new Error('At least one Terraform module with code is required');
    }

    const result = await query(
      `
        INSERT INTO provisioning_jobs (org_id, user_id, aws_connection_id, source, status, modules, updated_at)
        VALUES ($1, $2, $3, $4, 'draft', $5::jsonb, NOW())
        RETURNING *
      `,
      [orgId, userId, input.awsConnectionId, input.source, JSON.stringify(modules)]
    );

    return result.rows[0];
  }

  async listProvisioningJobs(orgId: string) {
    const result = await query(
      `
        SELECT *
        FROM provisioning_jobs
        WHERE org_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [orgId]
    );

    return result.rows;
  }

  async getProvisioningJob(orgId: string, jobId: string) {
    const result = await query(
      `SELECT * FROM provisioning_jobs WHERE org_id = $1 AND id = $2`,
      [orgId, jobId]
    );

    return result.rows[0] || null;
  }

  private async getAwsConnection(orgId: string, connectionId: string) {
    const result = await query(
      `SELECT * FROM aws_connections WHERE org_id = $1 AND id = $2`,
      [orgId, connectionId]
    );

    return result.rows[0] || null;
  }

  private buildTerraformEnv(connection: any, secret: any): Record<string, string> {
    return {
      AWS_REGION: connection.region,
      AWS_DEFAULT_REGION: connection.region,
      TF_VAR_aws_region: connection.region,
      TF_VAR_aws_account_id: connection.account_id,
      TF_VAR_aws_role_arn: connection.role_arn,
      TF_VAR_aws_external_id: secret?.externalId,
    };
  }

  async planProvisioningJob(orgId: string, userId: string, jobId: string) {
    const job = await this.getProvisioningJob(orgId, jobId);
    if (!job) {
      throw new Error('Provisioning job not found');
    }

    const connection = await this.getAwsConnection(orgId, job.aws_connection_id);
    if (!connection) {
      throw new Error('AWS connection not found');
    }

    const secret = await secretManagerService.getAwsConnectionSecret(userId, connection.id);

    await query(
      `UPDATE provisioning_jobs SET status = 'planning', error_message = NULL, updated_at = NOW() WHERE id = $1 AND org_id = $2`,
      [jobId, orgId]
    );

    const result = await terraformRunnerService.plan({
      jobId,
      modules: job.modules,
      env: this.buildTerraformEnv(connection, secret),
    });

    const status = result.success ? 'awaiting_approval' : 'plan_failed';
    const approvalStatus = result.success ? 'required' : 'not_requested';

    const updated = await query(
      `
        UPDATE provisioning_jobs
        SET status = $1,
            approval_status = $2,
            plan_log = $3,
            plan_summary = $4::jsonb,
            error_message = $5,
            planned_at = NOW(),
            updated_at = NOW()
        WHERE id = $6 AND org_id = $7
        RETURNING *
      `,
      [
        status,
        approvalStatus,
        result.log,
        JSON.stringify(result.summary),
        result.success ? null : 'Terraform plan failed',
        jobId,
        orgId,
      ]
    );

    return updated.rows[0];
  }

  async applyProvisioningJob(orgId: string, userId: string, jobId: string, approved: boolean) {
    if (!approved) {
      throw new Error('Explicit approval is required before terraform apply');
    }

    const job = await this.getProvisioningJob(orgId, jobId);
    if (!job) {
      throw new Error('Provisioning job not found');
    }

    if (!['awaiting_approval', 'planned'].includes(job.status) || !['required', 'approved'].includes(job.approval_status)) {
      throw new Error('Provisioning job must have a successful plan before apply');
    }

    const connection = await this.getAwsConnection(orgId, job.aws_connection_id);
    if (!connection) {
      throw new Error('AWS connection not found');
    }

    const secret = await secretManagerService.getAwsConnectionSecret(userId, connection.id);

    await query(
      `UPDATE provisioning_jobs SET status = 'applying', approval_status = 'approved', error_message = NULL, updated_at = NOW() WHERE id = $1 AND org_id = $2`,
      [jobId, orgId]
    );

    const result = await terraformRunnerService.apply({
      jobId,
      modules: job.modules,
      env: this.buildTerraformEnv(connection, secret),
    });

    const updated = await query(
      `
        UPDATE provisioning_jobs
        SET status = $1,
            apply_log = $2,
            error_message = $3,
            applied_at = CASE WHEN $4 THEN NOW() ELSE applied_at END,
            updated_at = NOW()
        WHERE id = $5 AND org_id = $6
        RETURNING *
      `,
      [
        result.success ? 'applied' : 'apply_failed',
        result.log,
        result.success ? null : 'Terraform apply failed',
        result.success,
        jobId,
        orgId,
      ]
    );

    return updated.rows[0];
  }
}

export default new ProvisioningService();
