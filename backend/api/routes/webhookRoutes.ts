import express, { Router } from 'express';

import {
  githubWebhookHealth,
  handleGithubWebhook,
} from '../controllers/githubWebhookController.js';

const router = Router();

router.post('/github', express.raw({ type: 'application/json', limit: '2mb' }), handleGithubWebhook);
router.get('/github/health', githubWebhookHealth);

export default router;
