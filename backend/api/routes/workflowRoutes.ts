import { Router } from 'express';

import { createWorkflowHandler, executeWorkflowHandler, getWorkflowHandler, getWorkflowTemplatesHandler, runWorkflowTemplateHandler } from '../controllers/workflowController.js';
import { createValidator } from '../../middleware/requestValidator.js';
import { requireTenantContext } from '../../middleware/tenantMiddleware.js';
import { createWorkflowBodySchema, workflowIdParamSchema } from '../../validators/workflowApiValidators.js';
import { z } from 'zod';

const router = Router();

router.use(requireTenantContext);

const templateRunSchema = z.object({
  inputs: z.record(z.any()).optional()
});

router.get('/templates', getWorkflowTemplatesHandler);
router.post('/templates/:templateId/run', createValidator('body', templateRunSchema), runWorkflowTemplateHandler);

router.post('/', createValidator('body', createWorkflowBodySchema), createWorkflowHandler);
router.get('/:workflowId', createValidator('params', workflowIdParamSchema), getWorkflowHandler);
router.post('/:workflowId/execute', createValidator('params', workflowIdParamSchema), executeWorkflowHandler);

export default router;
