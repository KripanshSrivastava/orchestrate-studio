import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

export interface AuthRequest extends Request {
  user?: any;
  traceId?: string;
}

interface AuditLog {
  timestamp: string;
  traceId: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure';
  details?: string;
}

const auditLogPath = path.join(process.cwd(), 'logs', 'audit.log');

/**
 * Ensure audit log directory exists
 */
function ensureLogDirectory(): void {
  const logDir = path.dirname(auditLogPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Log to file with append mode
 */
function logToFile(entry: AuditLog): void {
  try {
    ensureLogDirectory();
    fs.appendFileSync(auditLogPath, JSON.stringify(entry) + '\n');
  } catch (error) {
    console.error('[Audit] Failed to write audit log:', error);
  }
}

/**
 * Audit log middleware for tracking sensitive actions
 * Should be placed after auth middleware
 */
export const auditLog = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;
  const traceId = req.traceId || 'unknown';

  res.send = function (data: any) {
    const statusCode = res.statusCode;
    const userId = req.user?.id || 'anonymous';
    const userEmail = req.user?.email || 'unknown';
    const ipAddress = (req.ip || req.socket.remoteAddress || 'unknown') as string;
    const userAgent = req.get('user-agent') || 'unknown';

    // Determine sensitive actions to audit
    const sensitiveActions = [
      '/api/auth/signup',
      '/api/auth/logout',
      '/api/auth/refresh',
      '/api/applications',
      '/api/workflows',
      '/api/integrations',
      '/api/security',
      '/api/admin',
    ];

    const isSensitiveRoute = sensitiveActions.some((route) => req.path.includes(route));
    const isSensitiveMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    const shouldAudit = isSensitiveRoute || (isSensitiveMethod && req.user);

    if (shouldAudit) {
      const auditEntry: AuditLog = {
        timestamp: new Date().toISOString(),
        traceId,
        userId,
        userEmail,
        action: `${req.method} ${req.path}`,
        resource: extractResource(req.path),
        method: req.method,
        path: req.path,
        statusCode,
        ipAddress,
        userAgent,
        result: statusCode >= 400 ? 'failure' : 'success',
        details: extractDetails(req, data),
      };

      logToFile(auditEntry);

      // If this is an auth-critical action, also log to console
      if (req.path.includes('/auth/')) {
        console.info(`[AUDIT] User ${userEmail} (${userId}): ${req.method} ${req.path} - ${statusCode}`);
      }
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Extract resource type from path
 */
function extractResource(path: string): string {
  const match = path.match(/\/api\/(\w+)/);
  return match ? match[1].toUpperCase() : 'UNKNOWN';
}

/**
 * Extract relevant details from request/response
 */
function extractDetails(req: AuthRequest, res: any): string | undefined {
  try {
    const details: any = {};

    // Log request body for sensitive operations
    if (req.method !== 'GET' && req.body) {
      const body = { ...req.body };
      // Mask sensitive fields
      if (body.password) body.password = '***';
      if (body.token) body.token = '***';
      if (body.secret) body.secret = '***';
      details.requestBody = body;
    }

    // Log response errors
    if (typeof res === 'string' && res.includes('error')) {
      details.responseError = res.substring(0, 200);
    }

    return Object.keys(details).length > 0 ? JSON.stringify(details) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Log specific auth event (login, logout, password change, etc.)
 */
export const logAuthEvent = (
  userId: string,
  userEmail: string,
  eventType: 'LOGIN' | 'LOGOUT' | 'SIGNUP' | 'PASSWORD_CHANGE' | 'TOKEN_REFRESH' | 'MFA_ENABLED' | 'ROLE_CHANGE',
  traceId: string,
  details?: string
): void => {
  const auditEntry: AuditLog = {
    timestamp: new Date().toISOString(),
    traceId,
    userId,
    userEmail,
    action: eventType,
    resource: 'AUTH',
    method: 'AUTH',
    path: '/auth/event',
    statusCode: 200,
    ipAddress: 'internal',
    userAgent: 'system',
    result: 'success',
    details,
  };

  logToFile(auditEntry);
  console.info(`[AUDIT] ${eventType} for ${userEmail} (${userId})`);
};

/**
 * Get recent audit logs (for admin dashboard)
 */
export function getRecentAuditLogs(limit: number = 100): AuditLog[] {
  try {
    ensureLogDirectory();
    if (!fs.existsSync(auditLogPath)) {
      return [];
    }

    const content = fs.readFileSync(auditLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter((l) => l);
    return lines
      .slice(-limit)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((log) => log !== null) as AuditLog[];
  } catch (error) {
    console.error('[Audit] Failed to read audit logs:', error);
    return [];
  }
}

/**
 * Clear old audit logs (keep last N days)
 */
export function cleanupAuditLogs(daysToKeep: number = 30): void {
  try {
    ensureLogDirectory();
    if (!fs.existsSync(auditLogPath)) {
      return;
    }

    const content = fs.readFileSync(auditLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter((l) => l);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const recentLines = lines.filter((line) => {
      try {
        const log = JSON.parse(line);
        return new Date(log.timestamp) > cutoffDate;
      } catch {
        return false;
      }
    });

    fs.writeFileSync(auditLogPath, recentLines.join('\n') + (recentLines.length > 0 ? '\n' : ''));
    console.info(`[Audit] Cleaned up logs, kept ${recentLines.length} recent entries`);
  } catch (error) {
    console.error('[Audit] Failed to cleanup logs:', error);
  }
}

export default { auditLog, logAuthEvent, getRecentAuditLogs, cleanupAuditLogs };
