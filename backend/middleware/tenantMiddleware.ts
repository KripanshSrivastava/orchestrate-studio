/**
 * Multi-Tenant Context Middleware
 * Extracts org_id from JWT token and attaches TenantContext to request
 * Ensures all requests are scoped to user's organization
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../api/middleware/authMiddleware.js';
import { TenantContext, MissingOrgIdError } from '../types/multi-tenant.js';

/**
 * Extend Express Request to include tenant context
 */
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

/**
 * Extract org_id from authenticated user's Keycloak roles
 * Expected format: realm_access.roles = ['org:org-123', 'admin', ...]
 * First role starting with 'org:' becomes the org_id
 */
export const extractTenantContext = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const traceId = req.traceId || 'unknown';
  req.traceId = traceId;

  try {
    if (!req.user?.id || !req.user?.email) {
      console.warn(`[${traceId}] User not authenticated for tenant context`);
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
        traceId,
      });
      return;
    }

    // Extract org_id from Keycloak roles
    // Expected: realm_access.roles = ['org:org-123', 'admin', 'user']
    const orgRole = (req.user.realm_access?.roles || []).find(
      (role: string) => role.startsWith('org:')
    );

    if (!orgRole) {
      console.warn(`[${traceId}] No org role found for user ${req.user.id}`);
      res.status(403).json({
        code: 'NO_ORG_ASSIGNED',
        message: 'User has no organization assigned',
        traceId,
      });
      return;
    }

    // Parse org_id from 'org:org-123' → 'org-123'
    const orgId = orgRole.substring('org:'.length);

    if (!orgId || orgId.trim().length === 0) {
      console.warn(`[${traceId}] Invalid org role format: ${orgRole}`);
      res.status(403).json({
        code: 'INVALID_ORG_ROLE',
        message: 'Invalid organization role format',
        traceId,
      });
      return;
    }

    // Build tenant context
    const tenantContext: TenantContext = {
      org_id: orgId,
      user_id: req.user.id,
      email: req.user.email,
      trace_id: traceId,
    };

    // Attach to request
    req.tenantContext = tenantContext;
    (req as any).org_id = orgId; // Also attach directly for backward compatibility

    console.info(
      `[${traceId}] Tenant context extracted: org=${orgId}, user=${req.user.id}`
    );
    next();
  } catch (error) {
    console.error(`[${traceId}] Error extracting tenant context:`, error);
    res.status(500).json({
      code: 'TENANT_CONTEXT_ERROR',
      message: 'Failed to extract tenant context',
      traceId,
    });
  }
};

/**
 * Require tenant context
 * Use this middleware on protected routes that need org_id enforcement
 */
export const requireTenantContext = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const traceId = (req as any).traceId || 'unknown';

  if (!req.tenantContext?.org_id) {
    console.warn(`[${traceId}] Tenant context missing`);
    res.status(403).json({
      code: 'NO_TENANT_CONTEXT',
      message: 'Request missing tenant context',
      traceId,
    });
    return;
  }

  console.info(`[${traceId}] Tenant context required: org=${req.tenantContext.org_id}`);
  next();
};

/**
 * Assert tenant context exists on request
 * Throws error if missing (for use in route handlers)
 */
export function assertTenantContext(req: Request): TenantContext {
  if (!req.tenantContext?.org_id) {
    throw new MissingOrgIdError();
  }
  return req.tenantContext;
}

export default {
  extractTenantContext,
  requireTenantContext,
  assertTenantContext,
};
