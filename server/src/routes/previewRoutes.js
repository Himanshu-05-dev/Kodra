/**
 * @file previewRoutes.js
 * Layer 1: Routes - Preview Gateway endpoints.
 */

import { Router } from 'express';
import { PreviewController } from '../controllers/PreviewController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/:projectId/status', PreviewController.getPreviewStatus);
router.post('/:projectId/port', PreviewController.setPreviewPort);
router.get('/:projectId/detect', PreviewController.detectPreviewPort);

export default router;
