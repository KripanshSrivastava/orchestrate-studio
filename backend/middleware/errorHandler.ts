import { Request, Response, NextFunction } from 'express';
import { getCorrelationId, getRequestDuration } from './correlationIdMiddleware.js';

/**
 * Standard API Error class
 * All app errors should extend this
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public type: ErrorType,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Error type enumeration
 */
export enum ErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  EXTERNAL_SERVICE = 'external_service',
}

/**
 * Error code enumeration
 */
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_REQUEST = 'INVALID_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    type: string;
    message: string;
  };
  message: string;
  trace_id: string;
  timestamp: string;
  details?: Record<string, any>;
  duration_ms?: number;
}

/**
 * Global error handler middleware
 * Must be registered LAST in middleware chain
 * 
 * Handles:
 * - ApiError instances (structured errors)
 * - Standard Error instances (log and convert)
 * - Unknown errors (log and return 500)
 */
export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = getCorrelationId(req);
  const duration = getRequestDuration(req);

  // Check if response already sent
  if (res.headersSent) {
    console.error(`[${correlationId}] Error after headers sent:`, err);
    return;
  }

  // Handle ApiError (our structured errors)
  if (err instanceof ApiError) {
    handleApiError(err, req, res, correlationId, duration);
    return;
  }

  // Handle standard Error
  if (err instanceof Error) {
    handleStandardError(err, req, res, correlationId, duration);
    return;
  }

  // Handle unknown errors
  handleUnknownError(err, req, res, correlationId, duration);
}

/**
 * Handle ApiError instances
 */
function handleApiError(
  err: ApiError,
  _req: Request,
  res: Response,
  correlationId: string,
  duration: number
): void {
  // Log at appropriate level
  if (err.statusCode >= 500) {
    console.error(
      `[${correlationId}] API Error (${err.statusCode}): ${err.code} - ${err.message}`
    );
    if (err.details) {
      console.error(`[${correlationId}] Details:`, err.details);
    }
  } else {
    console.warn(
      `[${correlationId}] API Error (${err.statusCode}): ${err.code} - ${err.message}`
    );
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      code: err.code,
      type: err.type,
      message: err.message,
    },
    message: err.message,
    trace_id: correlationId,
    timestamp: new Date().toISOString(),
    duration_ms: duration,
  };

  if (err.details) {
    response.details = err.details;
  }

  res.status(err.statusCode).json(response);
}

/**
 * Handle standard Error instances
 */
function handleStandardError(
  err: Error,
  _req: Request,
  res: Response,
  correlationId: string,
  duration: number
): void {
  console.error(`[${correlationId}] Unhandled Error:`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  // Determine error type and code based on error message/name
  let code = ErrorCode.INTERNAL_ERROR;
  let type = ErrorType.SYSTEM;
  let statusCode = 500;

  if (err.name === 'ValidationError') {
    code = ErrorCode.INVALID_REQUEST;
    type = ErrorType.VALIDATION;
    statusCode = 400;
  } else if (err.name === 'NotFoundError') {
    code = ErrorCode.NOT_FOUND;
    type = ErrorType.NOT_FOUND;
    statusCode = 404;
  } else if (err.name === 'ConflictError') {
    code = ErrorCode.CONFLICT;
    type = ErrorType.CONFLICT;
    statusCode = 409;
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      type,
      message: err.message,
    },
    message: 'An unexpected error occurred',
    trace_id: correlationId,
    timestamp: new Date().toISOString(),
    duration_ms: duration,
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.details = {
      errorName: err.name,
      stack: err.stack?.split('\n'),
    };
  }

  res.status(statusCode).json(response);
}

/**
 * Handle completely unknown errors
 */
function handleUnknownError(
  err: any,
  _req: Request,
  res: Response,
  correlationId: string,
  duration: number
): void {
  console.error(`[${correlationId}] Unknown Error:`, err);

  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      type: ErrorType.SYSTEM,
      message: 'Internal server error',
    },
    message: 'An unexpected error occurred',
    trace_id: correlationId,
    timestamp: new Date().toISOString(),
    duration_ms: duration,
  };

  if (process.env.NODE_ENV === 'development') {
    response.details = { error: err };
  }

  res.status(500).json(response);
}

/**
 * Helper to create API errors
 */
export const ApiErrors = {
  unauthorized: (message = 'Unauthorized', details?: any) =>
    new ApiError(
      401,
      ErrorCode.UNAUTHORIZED,
      ErrorType.AUTHENTICATION,
      message,
      details
    ),

  forbidden: (message = 'Forbidden', details?: any) =>
    new ApiError(
      403,
      ErrorCode.FORBIDDEN,
      ErrorType.AUTHORIZATION,
      message,
      details
    ),

  badRequest: (message = 'Bad request', details?: any) =>
    new ApiError(
      400,
      ErrorCode.INVALID_REQUEST,
      ErrorType.VALIDATION,
      message,
      details
    ),

  notFound: (message = 'Resource not found', details?: any) =>
    new ApiError(
      404,
      ErrorCode.NOT_FOUND,
      ErrorType.NOT_FOUND,
      message,
      details
    ),

  conflict: (message = 'Resource conflict', details?: any) =>
    new ApiError(
      409,
      ErrorCode.CONFLICT,
      ErrorType.CONFLICT,
      message,
      details
    ),

  businessLogic: (message: string, details?: any) =>
    new ApiError(
      400,
      ErrorCode.INVALID_REQUEST,
      ErrorType.BUSINESS_LOGIC,
      message,
      details
    ),

  internalError: (message = 'Internal server error', details?: any) =>
    new ApiError(
      500,
      ErrorCode.INTERNAL_ERROR,
      ErrorType.SYSTEM,
      message,
      details
    ),

  serviceUnavailable: (message = 'Service unavailable', details?: any) =>
    new ApiError(
      503,
      ErrorCode.SERVICE_UNAVAILABLE,
      ErrorType.SYSTEM,
      message,
      details
    ),

  externalServiceError: (
    message = 'External service error',
    details?: any
  ) =>
    new ApiError(
      502,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorType.EXTERNAL_SERVICE,
      message,
      details
    ),
};
