/**
 * Example Express server setup with Keycloak
 * This shows how to integrate the authentication middleware
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyToken } from './api/middleware/authMiddleware';
import authRoutes from './api/routes/authRoutes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

/**
 * Protected route example
 * Requires valid JWT token
 */
app.get('/api/workflows', verifyToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Workflows retrieved successfully',
    data: [
      { id: 1, name: 'CI/CD Pipeline', status: 'active' },
      { id: 2, name: 'Deployment Workflow', status: 'active' },
    ],
  });
});

/**
 * Health check endpoint (no auth required)
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Keycloak: ${process.env.KEYCLOAK_URL}`);
  console.log(`📊 Realm: ${process.env.KEYCLOAK_REALM}`);
});

export default app;
