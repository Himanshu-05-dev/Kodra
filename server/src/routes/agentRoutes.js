/**
 * @file agentRoutes.js
 * Layer 1: Routes - AI Agent routes.
 */

import { Router } from 'express';
import { AgentController } from '../controllers/AgentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/:projectId/messages', AgentController.getMessages);
router.post('/:projectId/clear', AgentController.clearMessages);
router.post('/:projectId/cancel', AgentController.cancel);
router.post('/:projectId/heal', AgentController.heal);

export default router;
