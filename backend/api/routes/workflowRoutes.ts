import { Router } from 'express';

import { createWorkflowHandler, executeWorkflowHandler, getWorkflowHandler } from '../controllers/workflowController.js';
import { createValidator } from '../../middleware/requestValidator.js';
import { requireTenantContext } from '../../middleware/tenantMiddleware.js';
import { createWorkflowBodySchema, workflowIdParamSchema } from '../../validators/workflowApiValidators.js';

const router = Router();

router.use(requireTenantContext);

router.post('/', createValidator('body', createWorkflowBodySchema), createWorkflowHandler);
router.get('/:workflowId', createValidator('params', workflowIdParamSchema), getWorkflowHandler);
router.post('/:workflowId/execute', createValidator('params', workflowIdParamSchema), executeWorkflowHandler);

export default router;
