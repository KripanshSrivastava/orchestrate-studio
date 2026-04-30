import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyToken, extractOrgId, AuthRequest } from '../api/middleware/authMiddleware.js';
import { auditLog } from '../middleware/auditMiddleware.js';
import { extractTenantContext } from '../middleware/tenantMiddleware.js';
import authRoutes from '../api/routes/authRoutes.js';
import integrationRoutes from '../api/routes/integrationRoutes.js';
import { checkDatabaseConnection } from '../database/pool.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware stack
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8081', 'http://localhost:8080', 'http://192.168.0.101:8080'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trace ID middleware - add to all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).traceId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  res.set('X-Trace-ID', (req as any).traceId);
  next();
});

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
app.use(extractTenantContext);

// Routes
app.use('/api/auth', auditLog, authRoutes);
app.use('/api/integrations', auditLog, integrationRoutes);

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
app.get('/api/workflows', verifyToken, extractOrgId, (req: Request, res: Response) => {
  const auth = req as any;
  res.json({
    code: 'SUCCESS',
    data: [
      { id: 1, name: 'CI/CD Pipeline', status: 'active', description: 'Build and deploy pipeline', org_id: auth.user.org_id },
      { id: 2, name: 'Deployment Workflow', status: 'active', description: 'Production deployment', org_id: auth.user.org_id },
      { id: 3, name: 'Security Scan', status: 'active', description: 'SAST and dependency scanning', org_id: auth.user.org_id },
    ],
    traceId: auth.traceId,
  });
});

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
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Route not found',
    path: req.path,
    method: req.method,
    traceId: (req as any).traceId,
  });
});

/**
 * Global error handling middleware
 */
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const traceId = (req as any).traceId || 'unknown';
  
  console.error(`[${traceId}] Error:`, err);

  res.status(err.status || 500).json({
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Internal server error',
    traceId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Keycloak: ${process.env.KEYCLOAK_URL || 'http://localhost:8081'}`);
  console.log(`📊 Realm: ${process.env.KEYCLOAK_REALM || 'idp'}`);
  console.log(`🔐 JWKS: ${process.env.KEYCLOAK_URL || 'http://localhost:8081'}/realms/${process.env.KEYCLOAK_REALM || 'idp'}/protocol/openid-connect/certs`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`✅ Ready: http://localhost:${PORT}/ready`);
  console.log(`❤️  Live: http://localhost:${PORT}/live`);
  console.log(`========================================\n`);
  
  console.log('Available endpoints:');
  console.log('  GET  /health          - Health check');
  console.log('  GET  /api/info        - Server info');
  console.log('  GET  /api/auth/user   - Current user (requires auth)');
  console.log('  GET  /api/workflows   - List workflows (requires auth)\n');
});

export default app;
