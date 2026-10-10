/**
 * @file quotaMiddleware.js
 * Layer 1: Middleware - Intercepts API requests to verify resource quotas before execution.
 */

import { quotaService } from '../services/QuotaService.js';
import { config } from '../config/index.js';

/**
 * Middleware to check project creation limits before scaffolding a new workspace
 */
export async function enforceProjectCreationQuota(req, res, next) {
  // If billing guardrails are disabled in development mode, continue
  if (!config.billing.enabled && process.env.NODE_ENV !== 'test') {
    return next();
  }

  const userId = req.user?.uid || 'anonymous';

  try {
    await quotaService.enforceProjectCreationQuota(userId);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware to check AI token limits before running agent prompts
 */
export async function enforceTokenQuota(req, res, next) {
  if (!config.billing.enabled && process.env.NODE_ENV !== 'test') {
    return next();
  }

  const userId = req.user?.uid || 'anonymous';
  const prompt = req.body?.prompt || '';
  const estimatedTokens = Math.max(500, Math.round(prompt.length / 2));

  try {
    await quotaService.enforceTokenQuota(userId, estimatedTokens);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware to check compute limits before starting a sandbox
 */
export async function enforceComputeQuota(req, res, next) {
  if (!config.billing.enabled && process.env.NODE_ENV !== 'test') {
    return next();
  }

  const userId = req.user?.uid || 'anonymous';

  try {
    await quotaService.enforceComputeQuota(userId);
    next();
  } catch (err) {
    next(err);
  }
}
