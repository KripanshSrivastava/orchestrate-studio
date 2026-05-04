/**
 * Base Repository Layer with Multi-Tenant Enforcement
 * All repositories MUST extend this class
 * Enforces org_id on every query—no cross-org access possible
 */

import {
  BaseEntity,
  TenantContext,
  TenantQueryFilter,
  TenantQueryOptions,
  TenantQueryResult,
  CrossOrgAccessError,
  MissingOrgIdError,
} from '../types/multi-tenant.js';

/**
 * Abstract base repository
 * Injects org_id into all queries automatically
 * Prevents accidental cross-org data access
 */
export abstract class BaseRepository<T extends BaseEntity> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * CRITICAL: Validate org_id context before any query
   * Throws error if org_id missing
   */
  protected validateTenantContext(context: TenantContext): void {
    if (!context?.org_id) {
      throw new MissingOrgIdError();
    }
  }

  /**
   * Enforce org_id on filter object
   * Merges user's org_id into filter to prevent cross-org queries
   */
  protected enforceOrgIdFilter(
    context: TenantContext,
    filter: Partial<TenantQueryFilter> = {}
  ): TenantQueryFilter {
    this.validateTenantContext(context);

    // If filter tries to query different org, throw error
    if (filter.org_id && filter.org_id !== context.org_id) {
      throw new CrossOrgAccessError(
        context.org_id,
        filter.org_id,
        this.tableName
      );
    }

    return {
      ...filter,
      org_id: context.org_id,
    };
  }

  /**
   * Build SQL WHERE clause from filter
   * Includes org_id enforcement
   */
  protected buildWhereClause(filter: TenantQueryFilter): {
    sql: string;
    params: any[];
  } {
    const conditions: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = $${params.length + 1}`);
        params.push(value);
      }
    }

    return {
      sql:
        conditions.length > 0
          ? `WHERE ${conditions.join(' AND ')}`
          : 'WHERE 1=1',
      params,
    };
  }

  /**
   * Find single record by ID with org_id enforcement
   * Returns null if record not found or belongs to different org
   */
  async findById(
    context: TenantContext,
    id: string
  ): Promise<T | null> {
    this.validateTenantContext(context);

    const filter = this.enforceOrgIdFilter(context, { id });
    return this.findOne(context, filter);
  }

  /**
   * Find single record matching filter with org_id enforcement
   */
  abstract findOne(context: TenantContext, filter: TenantQueryFilter): Promise<T | null>;

  /**
   * Find all records matching filter with org_id enforcement
   */
  abstract findMany(
    context: TenantContext,
    filter: Partial<TenantQueryFilter>,
    options?: Partial<TenantQueryOptions>
  ): Promise<TenantQueryResult<T>>;

  /**
   * Create record with automatic org_id injection
   */
  abstract create(
    context: TenantContext,
    data: Omit<T, keyof BaseEntity>
  ): Promise<T>;

  /**
   * Update record with org_id validation
   * Prevents updating records from other orgs
   */
  abstract update(
    context: TenantContext,
    id: string,
    data: Partial<Omit<T, keyof BaseEntity>>
  ): Promise<T | null>;

  /**
   * Delete record with org_id validation
   * Prevents deleting records from other orgs
   */
  abstract delete(context: TenantContext, id: string): Promise<boolean>;

  /**
   * Delete all records matching filter with org_id enforcement
   * Used for cleanup/testing only
   */
  abstract deleteMany(context: TenantContext, filter: Partial<TenantQueryFilter>): Promise<number>;

  /**
   * Count records matching filter with org_id enforcement
   */
  abstract count(context: TenantContext, filter?: Partial<TenantQueryFilter>): Promise<number>;
}

export default BaseRepository;
