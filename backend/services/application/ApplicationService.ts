import { createHash } from 'node:crypto';
import { PoolClient } from 'pg';

import pool, { query } from '../../database/pool.js';
import { ApiErrors } from '../../middleware/errorHandler.js';
import { TenantContext } from '../../types/multi-tenant.js';

export type ApplicationStatus = 'active' | 'inactive' | 'archived' | 'deleted';

export interface ApplicationEntity {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

interface ApplicationRecord {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: ApplicationStatus;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ApplicationListFilters {
  page: number;
  limit: number;
  status?: ApplicationStatus;
  search?: string;
  sortBy: 'created_at' | 'updated_at' | 'name' | 'status';
  sortDirection: 'ASC' | 'DESC';
  includeDeleted: boolean;
}

export interface ApplicationListResponse {
  items: ApplicationEntity[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateApplicationInput {
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
}

export interface UpdateApplicationInput {
  name?: string;
  description?: string;
  status?: ApplicationStatus;
}

export interface CreateApplicationResult {
  application: ApplicationEntity;
  replayed: boolean;
}

interface IdempotencyRow {
  request_hash: string;
  response_body: ApplicationRecord;
}

const IDEMPOTENCY_SCOPE = 'applications.create';

const SORT_COLUMN_MAP: Record<ApplicationListFilters['sortBy'], string> = {
  created_at: 'created_at',
  updated_at: 'updated_at',
  name: 'name',
  status: 'status',
};

const toIsoString = (value: string | Date): string => {
  return value instanceof Date ? value.toISOString() : value;
};

const normalizeApplication = (record: ApplicationRecord): ApplicationEntity => ({
  ...record,
  created_at: toIsoString(record.created_at),
  updated_at: toIsoString(record.updated_at),
});

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);

  return `{${entries.join(',')}}`;
};

const hashPayload = (value: unknown): string => {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
};

const mapPgError = (error: unknown): never => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: string }).code);
    if (code === '23505') {
      throw ApiErrors.conflict('Application name already exists in this organization');
    }
  }

  throw ApiErrors.internalError('Failed to process application request');
};

class ApplicationService {
  async listApplications(context: TenantContext, filters: ApplicationListFilters): Promise<ApplicationListResponse> {
    const whereParts: string[] = ['org_id = $1'];
    const params: unknown[] = [context.org_id];

    if (!filters.includeDeleted) {
      params.push('deleted');
      whereParts.push(`status <> $${params.length}`);
    }

    if (filters.status) {
      params.push(filters.status);
      whereParts.push(`status = $${params.length}`);
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      whereParts.push(`(name ILIKE $${params.length} OR COALESCE(description, '') ILIKE $${params.length})`);
    }

    const whereClause = `WHERE ${whereParts.join(' AND ')}`;
    const sortColumn = SORT_COLUMN_MAP[filters.sortBy] || 'created_at';
    const sortDirection = filters.sortDirection === 'ASC' ? 'ASC' : 'DESC';

    const page = filters.page;
    const limit = filters.limit;
    const offset = (page - 1) * limit;

    const countSql = `SELECT COUNT(*)::int AS total FROM applications ${whereClause}`;
    const dataSql = `
      SELECT id, org_id, name, description, status, created_at, updated_at
      FROM applications
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const [countResult, dataResult] = await Promise.all([
      query<{ total: number }>(countSql, params),
      query<ApplicationRecord>(dataSql, [...params, limit, offset]),
    ]);

    return {
      items: dataResult.rows.map(normalizeApplication),
      total: countResult.rows[0]?.total ?? 0,
      page,
      limit,
    };
  }

  async getApplicationById(context: TenantContext, applicationId: string): Promise<ApplicationEntity> {
    const result = await query<ApplicationRecord>(
      `
      SELECT id, org_id, name, description, status, created_at, updated_at
      FROM applications
      WHERE org_id = $1 AND id = $2
      LIMIT 1
      `,
      [context.org_id, applicationId]
    );

    const record = result.rows[0];
    if (!record) {
      throw ApiErrors.notFound('Application not found');
    }

    return normalizeApplication(record);
  }

  async createApplication(
    context: TenantContext,
    payload: CreateApplicationInput,
    idempotencyKey: string
  ): Promise<CreateApplicationResult> {
    const trimmedKey = idempotencyKey.trim();
    if (!trimmedKey) {
      throw ApiErrors.badRequest('Missing required Idempotency-Key header');
    }

    const requestHash = hashPayload(payload);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existingResult = await client.query<IdempotencyRow>(
        `
        SELECT request_hash, response_body
        FROM api_idempotency_keys
        WHERE org_id = $1 AND scope = $2 AND idempotency_key = $3
        FOR UPDATE
        `,
        [context.org_id, IDEMPOTENCY_SCOPE, trimmedKey]
      );

      const existing = existingResult.rows[0];
      if (existing) {
        if (existing.request_hash !== requestHash) {
          throw ApiErrors.conflict('Idempotency key reused with different request payload');
        }

        await client.query('COMMIT');
        return {
          application: normalizeApplication(existing.response_body),
          replayed: true,
        };
      }

      const createResult = await client.query<ApplicationRecord>(
        `
        INSERT INTO applications (org_id, name, description, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, org_id, name, description, status, created_at, updated_at
        `,
        [
          context.org_id,
          payload.name.trim(),
          payload.description?.trim() || null,
          payload.status || 'active',
        ]
      );

      const created = createResult.rows[0];

      await client.query(
        `
        INSERT INTO api_idempotency_keys (
          org_id,
          scope,
          idempotency_key,
          request_hash,
          response_status,
          response_body,
          resource_id
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        `,
        [
          context.org_id,
          IDEMPOTENCY_SCOPE,
          trimmedKey,
          requestHash,
          201,
          JSON.stringify(created),
          created.id,
        ]
      );

      await client.query('COMMIT');

      return {
        application: normalizeApplication(created),
        replayed: false,
      };
    } catch (error) {
      await this.rollbackQuietly(client);

      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }

      return mapPgError(error);
    } finally {
      client.release();
    }
  }

  async updateApplication(
    context: TenantContext,
    applicationId: string,
    payload: UpdateApplicationInput
  ): Promise<ApplicationEntity> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (payload.name !== undefined) {
      params.push(payload.name.trim());
      updates.push(`name = $${params.length}`);
    }

    if (payload.description !== undefined) {
      params.push(payload.description.trim() || null);
      updates.push(`description = $${params.length}`);
    }

    if (payload.status !== undefined) {
      params.push(payload.status);
      updates.push(`status = $${params.length}`);
    }

    if (updates.length === 0) {
      throw ApiErrors.badRequest('No update fields provided');
    }

    params.push(context.org_id);
    const orgIdParam = params.length;
    params.push(applicationId);
    const idParam = params.length;

    const sql = `
      UPDATE applications
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE org_id = $${orgIdParam} AND id = $${idParam}
      RETURNING id, org_id, name, description, status, created_at, updated_at
    `;

    try {
      const result = await query<ApplicationRecord>(sql, params);
      const record = result.rows[0];

      if (!record) {
        throw ApiErrors.notFound('Application not found');
      }

      return normalizeApplication(record);
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      return mapPgError(error);
    }
  }

  async deleteApplication(
    context: TenantContext,
    applicationId: string,
    hardDelete: boolean
  ): Promise<{ id: string; deleted: boolean; mode: 'soft' | 'hard' }> {
    if (hardDelete) {
      const hardResult = await query<{ id: string }>(
        'DELETE FROM applications WHERE org_id = $1 AND id = $2 RETURNING id',
        [context.org_id, applicationId]
      );

      if (hardResult.rowCount === 0) {
        throw ApiErrors.notFound('Application not found');
      }

      return { id: applicationId, deleted: true, mode: 'hard' };
    }

    const softResult = await query<{ id: string }>(
      `
      UPDATE applications
      SET status = 'deleted', updated_at = NOW()
      WHERE org_id = $1 AND id = $2 AND status <> 'deleted'
      RETURNING id
      `,
      [context.org_id, applicationId]
    );

    if (softResult.rowCount === 0) {
      const exists = await query<{ id: string }>(
        'SELECT id FROM applications WHERE org_id = $1 AND id = $2',
        [context.org_id, applicationId]
      );

      if (exists.rowCount === 0) {
        throw ApiErrors.notFound('Application not found');
      }
    }

    return { id: applicationId, deleted: true, mode: 'soft' };
  }

  private async rollbackQuietly(client: PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback failures so we can surface the original error.
    }
  }
}

const applicationService = new ApplicationService();

export default applicationService;
