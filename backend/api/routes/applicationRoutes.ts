import { Router } from 'express';

import {
  createApplication,
  deleteApplication,
  getApplicationById,
  listApplications,
  updateApplication,
} from '../controllers/applicationController.js';
import { createValidator } from '../../middleware/requestValidator.js';
import { requireTenantContext } from '../../middleware/tenantMiddleware.js';
import {
  applicationIdParamSchema,
  createApplicationBodySchema,
  deleteApplicationQuerySchema,
  listApplicationsQuerySchema,
  updateApplicationBodySchema,
} from '../../validators/applicationValidators.js';

const router = Router();

router.use(requireTenantContext);

router.get('/', createValidator('query', listApplicationsQuerySchema), listApplications);
router.get('/:applicationId', createValidator('params', applicationIdParamSchema), getApplicationById);
router.post('/', createValidator('body', createApplicationBodySchema), createApplication);
router.put(
  '/:applicationId',
  createValidator('params', applicationIdParamSchema),
  createValidator('body', updateApplicationBodySchema),
  updateApplication
);
router.delete(
  '/:applicationId',
  createValidator('params', applicationIdParamSchema),
  createValidator('query', deleteApplicationQuerySchema),
  deleteApplication
);

export default router;
