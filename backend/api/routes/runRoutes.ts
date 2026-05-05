import { Router } from 'express';
import { getRunStatusHandler, getAllRunsHandler } from '../controllers/runController.js';

const router = Router();

// We might want to add tenant validation or other middleware here if required,
// but for now we keep it simple for the status API.
router.get('/', getAllRunsHandler);
router.get('/:id', getRunStatusHandler);

export default router;
