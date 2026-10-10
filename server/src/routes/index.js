/**
 * @file routes/index.js
 * Layer 1: API Route Aggregator for versioned endpoints.
 */

import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import projectRoutes from './projectRoutes.js';
import sandboxRoutes from './sandboxRoutes.js';
import agentRoutes from './agentRoutes.js';
import previewRoutes from './previewRoutes.js';
import { billingRouter } from './billingRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/projects', projectRoutes);
router.use('/sandbox', sandboxRoutes);
router.use('/agent', agentRoutes);
router.use('/preview', previewRoutes);
router.use('/billing', billingRouter);

export default router;

