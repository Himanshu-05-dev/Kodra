/**
 * @file sandboxRoutes.js
 * Layer 1: Routes - Sandbox lifecycle routes.
 */

import { Router } from 'express';
import { SandboxController } from '../controllers/SandboxController.js';

const router = Router();

router.get('/engine', SandboxController.getEngineHealth);
router.post('/:projectId/start', SandboxController.startSandbox);
router.post('/:projectId/stop', SandboxController.stopSandbox);
router.get('/:projectId/status', SandboxController.getStatus);

export default router;
