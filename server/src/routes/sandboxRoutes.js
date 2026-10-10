/**
 * @file sandboxRoutes.js
 * Layer 1: Routes - Sandbox lifecycle routes.
 */

import { Router } from 'express';
import { SandboxController } from '../controllers/SandboxController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/engine', SandboxController.getEngineHealth);
router.post('/:projectId/start', authenticate, SandboxController.startSandbox);
router.post('/:projectId/stop', authenticate, SandboxController.stopSandbox);
router.get('/:projectId/status', authenticate, SandboxController.getStatus);

export default router;
