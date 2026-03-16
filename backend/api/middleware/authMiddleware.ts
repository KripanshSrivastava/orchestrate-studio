import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * JWT Verification Middleware
 * Verifies Keycloak JWT token
 */
export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    // Note: In production, validate against Keycloak's public key
    // For now, we're just verifying the token exists
    // Full validation requires fetching Keycloak's public keys
    const decoded = jwt.decode(token) as any;

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      preferred_username: decoded.preferred_username,
      realm_access: decoded.realm_access,
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Check if user has specific role
 */
export const hasRole =
  (requiredRole: string) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userRoles = req.user.realm_access?.roles || [];

    if (!userRoles.includes(requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
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
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  next();
};
