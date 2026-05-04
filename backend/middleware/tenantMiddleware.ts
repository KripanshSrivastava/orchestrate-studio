/**
 * Multi-Tenant Context Middleware
 * Extracts org_id from JWT token and attaches TenantContext to request.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../api/middleware/authMiddleware.js';
import { TenantContext, MissingOrgIdError } from '../types/multi-tenant.js';

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

const resolveOrgId = (req: AuthRequest): string => {
  const roles = req.user?.realm_access?.roles || [];
  const orgRole = roles.find((role: string) => role.startsWith('org:'));
  const roleOrgId = orgRole?.substring('org:'.length).trim();

  return roleOrgId || req.user?.org_id || process.env.DEFAULT_ORG_ID || 'default-org';
};

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

    const orgId = resolveOrgId(req);

    if (!orgId || orgId.trim().length === 0) {
      console.warn(`[${traceId}] Organization context could not be resolved for user ${req.user.id}`);
      res.status(403).json({
        code: 'NO_ORG_ASSIGNED',
        message: 'User has no organization assigned',
        traceId,
      });
      return;
    }

    const tenantContext: TenantContext = {
      org_id: orgId,
      user_id: req.user.id,
      email: req.user.email,
      trace_id: traceId,
    };

    req.tenantContext = tenantContext;
    (req as any).org_id = orgId;

    console.info(`[${traceId}] Tenant context extracted: org=${orgId}, user=${req.user.id}`);
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
