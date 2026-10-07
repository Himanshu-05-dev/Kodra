/**
 * @file healthRoutes.js
 * Layer 1: Routes - Health check endpoint.
 */

import { Router } from 'express';
import { HealthController } from '../controllers/HealthController.js';

const router = Router();

router.get('/', HealthController.getHealth);

export default router;
