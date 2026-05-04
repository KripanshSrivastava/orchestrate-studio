import { Request, Response, NextFunction } from 'express';
import jwksService from '../../services/auth/jwksService.js';
import { KEYCLOAK_CONFIG } from '../../config/keycloak.js';

export interface AuthRequest extends Request {
  user?: any;
  traceId?: string;
}

const getOrgIdFromRoles = (roles: string[] = []): string => {
  const orgRole = roles.find((role) => role.startsWith('org:'));
  const orgId = orgRole?.substring('org:'.length).trim();
  return orgId || process.env.DEFAULT_ORG_ID || 'default-org';
};

/**
 * Generate unique trace ID for correlation
 */
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Validate token expiry
 */
export function validateTokenExpiry(exp: number, traceId: string): { valid: boolean; message: string } {
  const now = Math.floor(Date.now() / 1000);
  const expiryDate = new Date(exp * 1000);

  if (exp <= now) {
    const expiredSince = now - exp;
    console.warn(`[${traceId}] Token expired ${expiredSince}s ago (at ${expiryDate.toISOString()})`);
    return { valid: false, message: `Token expired at ${expiryDate.toISOString()}` };
  }

  const timeUntilExpiry = exp - now;
  console.info(`[${traceId}] Token valid, expires in ${timeUntilExpiry}s (at ${expiryDate.toISOString()})`);
  return { valid: true, message: 'Token expiry valid' };
}

/**
 * Validate token audience
 */
export function validateAudience(
  aud: string | string[] | undefined,
  traceId: string,
  authorizedParty?: string
): { valid: boolean; message: string } {
  const expectedAudiences = KEYCLOAK_CONFIG.allowedAudiences;

  const audiences = [
    ...(Array.isArray(aud) ? aud : aud ? [aud] : []),
    ...(authorizedParty ? [authorizedParty] : []),
  ];

  if (audiences.length === 0) {
    console.warn(`[${traceId}] Token missing audience/client claim`);
    return { valid: false, message: 'Token missing audience/client claim' };
  }

  const matches = audiences.some((audience) => expectedAudiences.includes(audience));

  if (!matches) {
    console.warn(`[${traceId}] Token audience/client mismatch. Expected one of: ${expectedAudiences.join(', ')}, Got: ${audiences.join(', ')}`);
    return { valid: false, message: `Token audience/client mismatch. Expected one of: ${expectedAudiences.join(', ')}` };
  }

  console.info(`[${traceId}] Token audience/client valid: ${audiences.join(', ')}`);
  return { valid: true, message: 'Audience/client claim valid' };
}

/**
 * Validate user claims
 */
export function validateUserClaims(
  decoded: any,
  traceId: string
): { valid: boolean; message: string; user?: any } {
  const requiredClaims = ['sub', 'email', 'name', 'preferred_username'];
  const missingClaims = requiredClaims.filter((claim) => !decoded[claim]);

  if (missingClaims.length > 0) {
    console.warn(`[${traceId}] Token missing required claims: ${missingClaims.join(', ')}`);
    return { valid: false, message: `Missing required claims: ${missingClaims.join(', ')}` };
  }

  // Additional validation
  if (typeof decoded.sub !== 'string' || !decoded.sub.trim()) {
    console.warn(`[${traceId}] Invalid subject claim`);
    return { valid: false, message: 'Invalid subject claim' };
  }

  if (typeof decoded.email !== 'string' || !decoded.email.includes('@')) {
    console.warn(`[${traceId}] Invalid email claim`);
    return { valid: false, message: 'Invalid email claim' };
  }

  console.info(`[${traceId}] User claims valid - sub: ${decoded.sub}, email: ${decoded.email}`);
  const roles = decoded.realm_access?.roles || [];

  return {
    valid: true,
    message: 'User claims valid',
    user: {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      preferred_username: decoded.preferred_username,
      realm_access: decoded.realm_access,
      org_id: getOrgIdFromRoles(roles),
    },
  };
}

/**
 * Validate all token claims
 */
export function validateTokenClaims(
  decoded: any,
  traceId: string
): { valid: boolean; message: string; user?: any } {
  // Validate expiry
  const expiryValidation = validateTokenExpiry(decoded.exp, traceId);
  if (!expiryValidation.valid) {
    return { valid: false, message: expiryValidation.message };
  }

  // Validate audience
  const audienceValidation = validateAudience(decoded.aud, traceId, decoded.azp || decoded.client_id);
  if (!audienceValidation.valid) {
    return { valid: false, message: audienceValidation.message };
  }

  // Validate user
  const userValidation = validateUserClaims(decoded, traceId);
  if (!userValidation.valid) {
    return { valid: false, message: userValidation.message };
  }

  console.info(`[${traceId}] ✅ All token claims validated successfully`);
  return { valid: true, message: 'All claims valid', user: userValidation.user };
}


/**
 * JWT Verification Middleware
 * Validates:
 * - Token signature via JWKS
 * - Token expiry
 * - Token audience
 * - User claims (sub, email, name, preferred_username)
 * - Issuer
 */
export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const traceId = req.traceId || generateTraceId();
  req.traceId = traceId;

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[${traceId}] Missing or invalid Authorization header`);
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header',
      traceId,
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    // Validate token signature and claims via JWKS
    const decoded = await jwksService.validateToken(token);

    // Validate all token claims (expiry, audience, user)
    const claimsValidation = validateTokenClaims(decoded, traceId);
    if (!claimsValidation.valid) {
      res.status(401).json({
        code: 'INVALID_TOKEN',
        message: `Token validation failed: ${claimsValidation.message}`,
        traceId,
      });
      return;
    }

    req.user = claimsValidation.user;
    console.info(`[${traceId}] ✅ User authenticated: ${decoded.sub}`);
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token verification failed';
    console.error(`[${traceId}] ❌ Token verification failed: ${message}`);

    const statusCode = message.includes('expired') ? 401 : 401;
    const code = message.includes('expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';

    res.status(statusCode).json({
      code,
      message: `Authentication failed: ${message}`,
      traceId,
    });
    return;
  }
};

/**
 * Check if user has specific role
 */
export const hasRole =
  (requiredRole: string) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    const traceId = req.traceId || generateTraceId();
    req.traceId = traceId;

    if (!req.user) {
      console.warn(`[${traceId}] User not authenticated`);
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
        traceId,
      });
      return;
    }

    const userRoles = req.user.realm_access?.roles || [];

    if (!userRoles.includes(requiredRole)) {
      console.warn(`[${traceId}] User lacks required role: ${requiredRole}`);
      res.status(403).json({
        code: 'FORBIDDEN',
        message: `Insufficient permissions. Required role: ${requiredRole}`,
        traceId,
      });
      return;
    }

    next();
  };

/**
 * Require authentication
 */
export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const traceId = req.traceId || generateTraceId();
  req.traceId = traceId;

  if (!req.user) {
    console.warn(`[${traceId}] Authentication required`);
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      traceId,
    });
    return;
  }

  next();
};

/**
 * Extract org_id from authenticated user
 * Enforces tenant isolation
 */
export const extractOrgId = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const traceId = req.traceId || generateTraceId();
  req.traceId = traceId;

  if (!req.user?.org_id) {
    console.warn(`[${traceId}] Organization ID not found in token`);
    res.status(401).json({
      code: 'INVALID_ORG',
      message: 'Organization ID not found in authentication context',
      traceId,
    });
    return;
  }

  // org_id is now available on req.user.org_id
  next();
};

/**
 * Force JWKS cache refresh (admin endpoint)
 */
export const refreshJWKS = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const traceId = req.traceId || generateTraceId();
  req.traceId = traceId;

  // This can be called by admin endpoints
  jwksService.refreshCache().then(() => {
    console.info(`[${traceId}] JWKS cache refreshed`);
    next();
  }).catch((error) => {
    console.error(`[${traceId}] JWKS refresh failed: ${error.message}`);
    res.status(500).json({
      code: 'JWKS_REFRESH_FAILED',
      message: 'Failed to refresh JWKS cache',
      traceId,
    });
    return;
  });
};

/**
 * Verify user and org_id are attached to request
 * Used after verifyToken and extractOrgId
 */
export const requireUserAndOrg = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const traceId = req.traceId || generateTraceId();
  req.traceId = traceId;

  if (!req.user) {
    console.error(`[${traceId}] User object missing from request`);
    res.status(401).json({
      code: 'MISSING_USER',
      message: 'User context not available',
      traceId,
    });
    return;
  }

  if (!req.user.org_id) {
    console.error(`[${traceId}] org_id missing from user context`);
    res.status(401).json({
      code: 'INVALID_ORG',
      message: 'Organization context not available',
      traceId,
    });
    return;
  }

  console.info(`[${traceId}] User verified - sub: ${req.user.id}, org: ${req.user.org_id}`);
  next();
};

export default { 
  verifyToken, 
  hasRole, 
  requireAuth, 
  extractOrgId, 
  refreshJWKS,
  requireUserAndOrg,
  validateTokenClaims,
  validateTokenExpiry,
  validateAudience,
  validateUserClaims,
};
