import { Router } from 'express';
import { verifyAppDeployment, getAppHealthStatus } from '../controllers/appVerificationController.js';
import { auditLog } from '../../middleware/auditMiddleware.js';

const router = Router();

// POST endpoint to verify app deployment with timeout handling
router.post('/verify', auditLog, verifyAppDeployment);

// GET endpoint for quick health check (query params)
router.get('/health', auditLog, getAppHealthStatus);

export default router;
