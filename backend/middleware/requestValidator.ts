import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { getCorrelationId } from './correlationIdMiddleware.js';

/**
 * Validation error response
 */
interface ValidationErrorDetail {
  path: string[];
  code: string;
  message: string;
}

export interface ValidationError {
  success: false;
  error: {
    code: 'INVALID_REQUEST';
    type: 'validation';
    message: 'Validation failed';
  };
  message: string;
  details: ValidationErrorDetail[];
  trace_id: string;
  timestamp: string;
}

/**
 * Type for validation targets
 */
export type ValidationTarget = 'body' | 'query' | 'params' | 'headers';

/**
 * Options for request validation middleware
 */
export interface ValidationOptions {
  strict?: boolean; // Fail on unknown fields (default: true)
  coerce?: boolean; // Attempt type coercion (default: true)
}

/**
 * Create validation middleware factory
 * 
 * Usage:
 * ```
 * const validateRequestBody = createValidator('body', createApplicationSchema);
 * app.post('/api/applications', validateRequestBody, createApplicationHandler);
 * ```
 * 
 * @param target Which part of request to validate (body, query, params, headers)
 * @param schema Zod schema to validate against
 * @param options Validation options
 * @returns Express middleware
 */
export function createValidator(
  target: ValidationTarget,
  schema: ZodSchema,
  _options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Extract target data
      const data = getRequestData(req, target);

      // Validate using Zod
      const result = schema.safeParse(data);

      if (!result.success) {
        // Validation failed
        const error = result.error as ZodError;
        const details = formatZodErrors(error);
        const correlationId = getCorrelationId(req);

        console.warn(
          `[${correlationId}] Validation failed for ${target}:`,
          JSON.stringify(details)
        );

        const response: ValidationError = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            type: 'validation',
            message: 'Validation failed',
          },
          message: `Request ${target} validation failed`,
          details,
          trace_id: correlationId,
          timestamp: new Date().toISOString(),
        };

        res.status(400).json(response);
        return;
      }

      // Validation passed - attach validated data to request
      (req as any).validated = {
        ...(req as any).validated,
        [target]: result.data,
      };

      next();
    } catch (error) {
      const correlationId = getCorrelationId(req);
      console.error(
        `[${correlationId}] Validation middleware error:`,
        error
      );

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          type: 'system',
          message: 'Validation system error',
        },
        message: 'Internal validation error',
        trace_id: correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Extract data from request based on target
 */
function getRequestData(req: Request, target: ValidationTarget): any {
  switch (target) {
    case 'body':
      return req.body;
    case 'query':
      return req.query;
    case 'params':
      return req.params;
    case 'headers':
      return req.headers;
    default:
      throw new Error(`Unknown validation target: ${target}`);
  }
}

/**
 * Format Zod errors into readable details
 */
function formatZodErrors(error: ZodError): ValidationErrorDetail[] {
  return error.errors.map((err) => ({
    path: err.path.map((p) => p.toString()),
    code: err.code,
    message: err.message,
  }));
}

/**
 * Helper to get validated data from request
 * @param req Express Request
 * @param target Validation target
 * @returns Validated data or undefined
 */
export function getValidated<T>(
  req: Request,
  target: ValidationTarget
): T | undefined {
  return (req as any).validated?.[target] as T | undefined;
}

/**
 * Validation schema helpers for common patterns
 */
export const ValidationSchemas = {
  /**
   * Resource ID validation
   */
  resourceId: (fieldName = 'id') => ({
    [fieldName]: (z: any) =>
      z.string().min(1).max(255).describe('Resource ID'),
  }),

  /**
   * Organization context validation
   */
  orgContext: (z: any) => ({
    orgId: z.string().min(1).max(255).describe('Organization ID'),
  }),

  /**
   * Common pagination
   */
  pagination: (z: any) => ({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(50)
      .describe('Results limit'),
    offset: z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .describe('Results offset'),
  }),

  /**
   * Common status enum
   */
  status: (allowedValues: string[]) =>
    (z: any) => ({
      status: z
        .enum(allowedValues as [string, ...string[]])
        .describe('Status filter'),
    }),
};
