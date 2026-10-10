/**
 * @file billingRoutes.js
 * Layer 1: Routes - Endpoints for Usage Metering, Subscriptions, Checkout & Webhooks.
 */

import { Router } from 'express';
import { BillingController } from '../controllers/BillingController.js';

export const billingRouter = Router();

billingRouter.get('/usage', BillingController.getUsageStatus);
billingRouter.get('/subscription', BillingController.getSubscription);
billingRouter.post('/checkout', BillingController.createCheckout);
billingRouter.post('/portal', BillingController.createPortal);
billingRouter.post('/upgrade-direct', BillingController.upgradeDirect);
billingRouter.post('/webhook', BillingController.handleWebhook);
