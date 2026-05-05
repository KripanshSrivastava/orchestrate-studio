import { Router } from 'express';

import { getPlatformSnapshot, performPlatformAction } from '../controllers/platformController.js';
import { auditLog } from '../../middleware/auditMiddleware.js';
import { requireTenantContext } from '../../middleware/tenantMiddleware.js';

const router = Router();

router.use(requireTenantContext);

router.get('/snapshot', auditLog, getPlatformSnapshot);
router.post('/actions/:resource/:id', auditLog, performPlatformAction);

export default router;

