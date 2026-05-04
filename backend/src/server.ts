import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { verifyToken, extractOrgId, AuthRequest } from '../api/middleware/authMiddleware.js';
import { auditLog } from '../middleware/auditMiddleware.js';
import { extractTenantContext } from '../middleware/tenantMiddleware.js';
import authRoutes from '../api/routes/authRoutes.js';
import integrationRoutes from '../api/routes/integrationRoutes.js';
import applicationRoutes from '../api/routes/applicationRoutes.js';
import provisioningRoutes from '../api/routes/provisioningRoutes.js';
import workflowRoutes from '../api/routes/workflowRoutes.js';
import webhookRoutes from '../api/routes/webhookRoutes.js';
import runRoutes from '../api/routes/runRoutes.js';
import { checkDatabaseConnection, query } from '../database/pool.js';
import { correlationIdMiddleware } from '../middleware/correlationIdMiddleware.js';
import { globalErrorHandler } from '../middleware/errorHandler.js';
import { validateConfig, getAllEnv, isFeatureEnabled } from '../config/configValidator.js';
import { initializeSocketServer } from '../services/realtime/socketServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate configuration before starting
const env = validateConfig();

dotenv.config();

const app: Express = express();
const PORT = env.PORT;
const allowedOrigins = env.CORS_ORIGINS
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware stack
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

/**
 * Correlation ID middleware - First middleware after basic setup
 * Generates unique correlation/trace IDs for all requests
 * Essential for distributed tracing and debugging
 */
app.use(correlationIdMiddleware);

const jsonParser = express.json({ limit: `${env.MAX_PAYLOAD_SIZE_MB}mb` });
const urlencodedParser = express.urlencoded({ extended: true, limit: `${env.MAX_PAYLOAD_SIZE_MB}mb` });

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/webhooks')) {
    next();
    return;
  }

  jsonParser(req, res, next);
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/webhooks')) {
    next();
    return;
  }

  urlencodedParser(req, res, next);
});

/**
 * Swagger UI Documentation - Register EARLY before auth middleware
 * Available at /api-docs, /api-docs.json, /api-docs.yaml
 */
try {
  const openapiPath = join(__dirname, '../docs/openapi.yml');
  const openapiFile = readFileSync(openapiPath, 'utf8');
  const openapi = YAML.parse(openapiFile);

  const swaggerOptions = {
    customCss: '.topbar { display: none }',
    customSiteTitle: 'Orchestrate Studio API',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
    },
  };

  if (isFeatureEnabled('ENABLE_SWAGGER_UI')) {
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(openapi, swaggerOptions));

    // Serve OpenAPI spec as JSON
    app.get('/api-docs.json', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(openapi);
    });

    // Serve OpenAPI spec as YAML
    app.get('/api-docs.yaml', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/yaml');
      res.send(openapiFile);
    });

    console.log('✅ Swagger UI initialized at /api-docs');
  }
} catch (error) {
  console.error('⚠️  Failed to load OpenAPI spec:', error instanceof Error ? error.message : error);
  process.exit(1);
}

/**
 * Global auth middleware for protected API routes
 * Attaches user + org_id to all requests
 * Rejects invalid tokens early
 */
const globalAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Skip auth for public endpoints
  if (
    req.path === '/health' ||
    req.path === '/ready' ||
    req.path === '/live' ||
    req.path === '/api/info' ||
    req.path.startsWith('/api/auth')
  ) {
    return next();
  }

  // All other /api/* routes require authentication
  if (req.path.startsWith('/api/')) {
    try {
      await verifyToken(req, res, () => {
        // If we reach here, token is valid
        // Ensure org_id is extracted
        if (!req.user?.org_id) {
          console.warn(`[${req.traceId}] User authenticated but org_id missing, extracting...`);
          return extractOrgId(req, res, () => next());
        }
        next();
      });
    } catch (error) {
      console.error(`[${req.traceId}] Auth middleware error:`, error);
    }
  } else {
    next();
  }
};

app.use(globalAuthMiddleware);

/**
 * Multi-tenant context middleware
 * Extracts org_id from JWT and attaches TenantContext to request
 * All authenticated requests now have tenantContext available
 */
app.use((req: AuthRequest, res: Response, next: NextFunction) => {
  // Tenant context is required only for protected API routes.
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }

  if (
    req.path.startsWith('/api/auth') ||
    req.path === '/api/info'
  ) {
    next();
    return;
  }

  extractTenantContext(req, res, next);
});

// Routes
app.use('/api/auth', auditLog, authRoutes);
app.use('/api/integrations', auditLog, integrationRoutes);
app.use('/api/applications', auditLog, applicationRoutes);
app.use('/api/provisioning', auditLog, provisioningRoutes);
app.use('/api/workflows', auditLog, workflowRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/runs', runRoutes);

/**
 * Health check endpoint (K8s liveness)
 * Returns 200 if server is running (no services checked)
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * Temporary DB connectivity check
 */
app.get('/db-test', async (_req: Request, res: Response) => {
  try {
    const result = await query<{ ok: number }>('SELECT 1 as ok');
    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Readiness check endpoint (K8s readiness)
 * Returns 200 only if all critical services are ready
 */
app.get('/ready', async (_req: Request, res: Response) => {
  try {
    const databaseReady = await checkDatabaseConnection();

    if (!databaseReady) {
      res.status(503).json({
        status: 'not_ready',
        checks: {
          database: 'failed',
          redis: 'ok',
          keycloak: 'ok',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check Redis connectivity (when implemented)
    // Check Keycloak/JWKS availability (when implemented)

    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok', // TODO: implement actual check
        keycloak: 'ok', // TODO: implement actual check
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Liveness check endpoint (K8s liveness with dependencies)
 * Similar to ready but without some optional dependencies
 */
app.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Protected route example
 * Requires valid JWT token and organization context
 */

/**
 * Get server info
 */
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    code: 'SUCCESS',
    data: {
      name: 'Internal Developer Platform API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      jwks: {
        enabled: true,
        url: `${process.env.KEYCLOAK_URL || 'http://localhost:8081'}/realms/${process.env.KEYCLOAK_REALM || 'idp'}/protocol/openid-connect/certs`,
      },
      keycloak: {
        url: process.env.KEYCLOAK_URL,
        realm: process.env.KEYCLOAK_REALM,
        clientId: process.env.KEYCLOAK_CLIENT_ID,
      },
    },
  });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  const requestWithContext = req as Request & { context?: { correlationId?: string } };

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      type: 'not_found',
      message: 'Route not found',
    },
    message: `Route not found: ${req.method} ${req.path}`,
    trace_id: requestWithContext.context?.correlationId || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Global error handling middleware - MUST be last in middleware chain
 * Handles all errors thrown by routes or other middleware
 */
app.use(globalErrorHandler);

// Start server
const httpServer = createServer(app);
initializeSocketServer(httpServer, allowedOrigins);

httpServer.listen(PORT, () => {
  const config = getAllEnv();
  console.log(`\n========================================`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${config.NODE_ENV}`);
  if (isFeatureEnabled('ENABLE_SWAGGER_UI')) {
    console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
    console.log(`📋 OpenAPI JSON: http://localhost:${PORT}/api-docs.json`);
    console.log(`📋 OpenAPI YAML: http://localhost:${PORT}/api-docs.yaml`);
  }
  console.log(`📚 Keycloak: ${config.KEYCLOAK_URL || 'http://localhost:8081'}`);
  console.log(`📊 Realm: ${config.KEYCLOAK_REALM}`);
  console.log(`🔐 JWKS: ${config.KEYCLOAK_URL || 'http://localhost:8081'}/realms/${config.KEYCLOAK_REALM}/protocol/openid-connect/certs`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`✅ Ready: http://localhost:${PORT}/ready`);
  console.log(`❤️  Live: http://localhost:${PORT}/live`);
  console.log(`\n📋 Middleware Stack:`);
  console.log(`   ✅ Correlation ID tracking enabled`);
  console.log(`   ✅ Global error handler enabled`);
  if (isFeatureEnabled('ENABLE_AUDIT_LOGGING')) {
    console.log(`   ✅ Audit logging enabled`);
  }
  if (config.ENABLE_MULTI_TENANCY === 'true') {
    console.log(`   ✅ Multi-tenancy enabled`);
  }
  console.log(`========================================\n`);
  
  console.log('Available endpoints:');
  console.log('  GET  /health          - Health check');
  console.log('  GET  /api/info        - Server info');
  console.log('  GET  /api/auth/user   - Current user (requires auth)');
});

export default app;
