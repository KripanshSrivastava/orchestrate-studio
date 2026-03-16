import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyToken } from '../api/middleware/authMiddleware';
import authRoutes from '../api/routes/authRoutes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8081'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

/**
 * Health check endpoint (no auth required)
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Protected route example
 * Requires valid JWT token
 */
app.get('/api/workflows', verifyToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Workflows retrieved successfully',
    data: [
      { id: 1, name: 'CI/CD Pipeline', status: 'active', description: 'Build and deploy pipeline' },
      { id: 2, name: 'Deployment Workflow', status: 'active', description: 'Production deployment' },
      { id: 3, name: 'Security Scan', status: 'active', description: 'SAST and dependency scanning' },
    ],
  });
});

/**
 * Get server info
 */
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: 'Internal Developer Platform API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    keycloak: {
      url: process.env.KEYCLOAK_URL,
      realm: process.env.KEYCLOAK_REALM,
    },
  });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

/**
 * Global error handling middleware
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Keycloak: ${process.env.KEYCLOAK_URL || 'http://localhost:8081'}`);
  console.log(`📊 Realm: ${process.env.KEYCLOAK_REALM || 'idp'}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================\n`);
  
  console.log('Available endpoints:');
  console.log('  GET  /health          - Health check');
  console.log('  GET  /api/info        - Server info');
  console.log('  GET  /api/auth/user   - Current user (requires auth)');
  console.log('  GET  /api/workflows   - List workflows (requires auth)\n');
});

export default app;
