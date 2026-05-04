/**
 * Multi-Tenant Type Definitions
 * Base interfaces for org_id enforcement across all entities
 */

/**
 * Base entity with org_id for multi-tenant isolation
 * ALL database entities must extend this
 */
export interface BaseEntity {
  id: string;
  org_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Base request context with tenant info
 * Attached to Express request in middleware
 */
export interface TenantContext {
  org_id: string;
  user_id: string;
  email: string;
  trace_id: string;
}

/**
 * Query filter enforcing org_id isolation
 * All queries MUST use this filter
 */
export interface TenantQueryFilter {
  org_id: string;
  [key: string]: any;
}

/**
 * Multi-tenant query options
 */
export interface TenantQueryOptions {
  org_id: string;
  limit?: number;
  offset?: number;
  order_by?: string;
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Query result with tenant validation
 */
export interface TenantQueryResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  org_id: string;
}

/**
 * Cross-org access error
 * Thrown when trying to access another org's data
 */
export class CrossOrgAccessError extends Error {
  constructor(org_id: string, requested_org_id: string, resource: string) {
    super(
      `Cross-org access denied: User org ${org_id} cannot access ${resource} in org ${requested_org_id}`
    );
    this.name = 'CrossOrgAccessError';
  }
}

/**
 * Missing org_id error
 * Thrown when org_id not available in context
 */
export class MissingOrgIdError extends Error {
  constructor() {
    super('org_id not found in authentication context');
    this.name = 'MissingOrgIdError';
  }
}

export default {
  CrossOrgAccessError,
  MissingOrgIdError,
};
