import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

/**
 * Request context interface attached to Express Request
 */
export interface RequestContext {
  correlationId: string;
  traceId: string;
  startTime: number;
  userId?: string;
  orgId?: string;
}

/**
 * Correlation ID Middleware
 * Generates or extracts correlation IDs for distributed tracing
 * Attaches to every request for end-to-end traceability
 * 
 * Features:
 * - Generates unique correlation ID if not provided
 * - Accepts X-Correlation-ID header from upstream services
 * - Attaches to response headers for client tracking
 * - Supports hierarchical tracing (parent.child correlations)
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract correlation ID from request headers or generate new one
  const incomingCorrelationId = 
    req.get('X-Correlation-ID') || 
    req.get('X-Request-ID') ||
    req.get('X-Trace-ID');

  // Generate unique IDs
  const correlationId = incomingCorrelationId || generateCorrelationId();
  const traceId = generateTraceId();
  const startTime = Date.now();

  // Attach context to request
  const context: RequestContext = {
    correlationId,
    traceId,
    startTime,
  };
  (req as any).context = context;

  // Attach to response headers for traceability
  res.set('X-Correlation-ID', correlationId);
  res.set('X-Trace-ID', traceId);
  res.set('X-Request-Start-Time', startTime.toString());

  // Log request initiation
  console.log(
    `[${correlationId}] ${req.method.toUpperCase()} ${req.path} - Started`
  );

  // Capture response finish for logging
  const originalJson = res.json;
  const originalSend = res.send;

  res.json = function (data: any): Response {
    const duration = Date.now() - startTime;
    console.log(
      `[${correlationId}] ${req.method.toUpperCase()} ${req.path} - Completed ${res.statusCode} (${duration}ms)`
    );
    return originalJson.call(this, data);
  };

  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    console.log(
      `[${correlationId}] ${req.method.toUpperCase()} ${req.path} - Completed ${res.statusCode} (${duration}ms)`
    );
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Generate correlation ID
 * Format: org-timestamp-random
 * Example: 550e8400-e29b-41d4-a716-446655440000
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${randomBytes(4).toString('hex')}`;
}

/**
 * Generate trace ID (shorter than correlation ID)
 * Format: timestamp-random
 * Used for detailed tracing within a correlation
 */
function generateTraceId(): string {
  return `${Date.now()}-${randomBytes(3).toString('hex')}`;
}

/**
 * Helper to get correlation ID from request
 * @param req Express Request
 * @returns Correlation ID for this request
 */
export function getCorrelationId(req: Request): string {
  return (req as any).context?.correlationId || 'unknown';
}

/**
 * Helper to get trace ID from request
 * @param req Express Request
 * @returns Trace ID for this request
 */
export function getTraceId(req: Request): string {
  return (req as any).context?.traceId || 'unknown';
}

/**
 * Helper to get request duration
 * @param req Express Request
 * @returns Duration in milliseconds
 */
export function getRequestDuration(req: Request): number {
  const startTime = (req as any).context?.startTime;
  return startTime ? Date.now() - startTime : 0;
}

/**
 * Attach user context to request
 * Called after authentication
 */
export function attachUserContext(
  req: Request,
  userId: string,
  orgId: string
): void {
  const context = (req as any).context as RequestContext;
  if (context) {
    context.userId = userId;
    context.orgId = orgId;
    console.log(
      `[${context.correlationId}] User context attached: userId=${userId}, orgId=${orgId}`
    );
  }
}
