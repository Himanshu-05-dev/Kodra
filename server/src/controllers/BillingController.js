/**
 * @file BillingController.js
 * Layer 1: Controller - Handles HTTP requests for Usage Metrics, Subscriptions,
 * Stripe Checkout, Customer Portal, and Webhooks.
 */

import { ApiResponse } from '../utils/ApiResponse.js';
import { billingService } from '../services/BillingService.js';
import { quotaService } from '../services/QuotaService.js';
import { usageService } from '../services/UsageService.js';
import { stripeAdapter } from '../infrastructure/billing/StripeAdapter.js';

function getRequestUserId(req) {
  return req.user?.uid || req.headers['x-user-id'] || 'anonymous';
}

function getRequestUserEmail(req) {
  return req.user?.email || req.body?.email || req.headers['x-user-email'] || '';
}

export class BillingController {
  /**
   * GET /api/v1/billing/usage
   * Return resource quotas, limits, percentages, and plan status
   */
  static async getUsageStatus(req, res, next) {
    try {
      const userId = getRequestUserId(req);
      const status = await quotaService.getUserQuotaStatus(userId);
      return ApiResponse.success(res, status);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/billing/subscription
   * Return current subscription plan and status
   */
  static async getSubscription(req, res, next) {
    try {
      const userId = getRequestUserId(req);
      const sub = await billingService.subRepo.getSubscription(userId);
      return ApiResponse.success(res, sub);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/billing/checkout
   * Initiate Stripe checkout session for Pro upgrade
   */
  static async createCheckout(req, res, next) {
    try {
      const userId = getRequestUserId(req);
      const email = getRequestUserEmail(req);
      const { priceId, returnUrl = 'http://localhost:5173' } = req.body || {};

      const session = await billingService.createCheckoutSession({
        userId,
        email,
        priceId,
        returnUrl
      });

      return ApiResponse.success(res, session, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/billing/portal
   * Generate billing customer portal URL
   */
  static async createPortal(req, res, next) {
    try {
      const userId = getRequestUserId(req);
      const { returnUrl = 'http://localhost:5173' } = req.body || {};

      const portal = await billingService.createPortalSession(userId, returnUrl);
      return ApiResponse.success(res, portal);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/billing/upgrade-direct
   * Instant plan upgrade for testing or dev mode
   */
  static async upgradeDirect(req, res, next) {
    try {
      const userId = getRequestUserId(req);
      const { plan = 'pro' } = req.body || {};

      const updated = await billingService.upgradeUserDirect(userId, plan);
      return ApiResponse.success(res, updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/billing/webhook
   * Ingest and verify Stripe webhook events
   */
  static async handleWebhook(req, res, next) {
    try {
      const signature = req.headers['stripe-signature'] || '';
      const payload = req.rawBody || req.body;

      const event = stripeAdapter.constructWebhookEvent(payload, signature);
      const result = await billingService.handleWebhookEvent(event);

      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}
