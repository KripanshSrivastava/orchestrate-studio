import { Router } from 'express';
import { getInfraOptions, createEc2Instance, destroyEc2Instance } from '../controllers/infraController.js';
import { auditLog } from '../../middleware/auditMiddleware.js';

const router = Router();

router.get('/options', auditLog, getInfraOptions);
router.post('/aws/ec2', auditLog, createEc2Instance);
router.delete('/aws/ec2/:id', auditLog, destroyEc2Instance);

export default router;
