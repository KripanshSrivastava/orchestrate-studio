import { Router } from 'express';
import { getProjectInfra } from '../controllers/infraController.js';
import { auditLog } from '../../middleware/auditMiddleware.js';

const router = Router();

router.get('/:id/infra', auditLog, getProjectInfra);

export default router;
