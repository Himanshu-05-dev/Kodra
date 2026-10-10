/**
 * @file BillingService.js
 * Layer 2: Business Logic - Orchestrates Stripe Subscriptions, Checkout Sessions,
 * Customer Portal, and Webhook Lifecycle Events.
 */

import { stripeAdapter as defaultStripeAdapter } from '../infrastructure/billing/StripeAdapter.js';
import { subscriptionRepository as defaultSubRepo } from '../repositories/SubscriptionRepository.js';
import { quotaService as defaultQuotaService } from './QuotaService.js';
import { SubscriptionPlan, SubscriptionStatus } from '@kodra/shared';
import { ValidationError, NotFoundError, BillingError } from '../utils/AppError.js';
import { logger } from '../infrastructure/logger/logger.js';

export class BillingService {
  /**
   * @param {import('../infrastructure/billing/StripeAdapter.js').StripeAdapter} [stripe]
   * @param {import('../repositories/SubscriptionRepository.js').SubscriptionRepository} [subRepo]
   * @param {import('./QuotaService.js').QuotaService} [quotaSvc]
   */
  constructor(
    stripe = defaultStripeAdapter,
    subRepo = defaultSubRepo,
    quotaSvc = defaultQuotaService
  ) {
    this.stripe = stripe;
    this.subRepo = subRepo;
    this.quotaService = quotaSvc;
  }

  /**
   * Initiate Checkout Session to upgrade user to Pro
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.email
   * @param {string} [params.priceId]
   * @param {string} params.returnUrl
   */
  async createCheckoutSession({ userId, email, priceId, returnUrl }) {
    if (!userId) {
      throw new ValidationError('User ID is required to initiate billing checkout.');
    }

    const currentSub = await this.subRepo.getSubscription(userId);
    let customerId = currentSub?.stripeCustomerId;

    if (!customerId && email) {
      const customer = await this.stripe.createCustomer({ uid: userId, email });
      customerId = customer.id;
      await this.subRepo.upsertSubscription(userId, { stripeCustomerId: customerId });
    }

    const successUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}checkout_success=true`;
    const cancelUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}checkout_cancelled=true`;

    const session = await this.stripe.createCheckoutSession({
      userId,
      customerEmail: email,
      customerId,
      priceId,
      successUrl,
      cancelUrl
    });

    logger.info(`BillingService: Created checkout session for user [${userId}]`);
    return session;
  }

  /**
   * Create a Customer Portal session for managing active cards, invoices, and plans
   * @param {string} userId
   * @param {string} returnUrl
   */
  async createPortalSession(userId, returnUrl) {
    if (!userId) {
      throw new ValidationError('User ID is required.');
    }

    const sub = await this.subRepo.getSubscription(userId);
    if (!sub || !sub.stripeCustomerId) {
      throw new BillingError('No active billing profile found. Please subscribe to Pro first.');
    }

    const portal = await this.stripe.createPortalSession(sub.stripeCustomerId, returnUrl);
    return portal;
  }

  /**
   * Process validated Stripe webhook event
   * @param {object} event
   */
  async handleWebhookEvent(event) {
    if (!event || !event.type) {
      throw new ValidationError('Invalid webhook payload structure.');
    }

    const eventType = event.type;
    const dataObj = event.data?.object || {};

    logger.info(`BillingService: Processing webhook event "${eventType}" [${event.id || 'mock'}]`);

    switch (eventType) {
      case 'checkout.session.completed': {
        const userId = dataObj.client_reference_id || dataObj.metadata?.kodraUserId;
        const customerId = dataObj.customer;
        const subscriptionId = dataObj.subscription;

        if (userId) {
          await this.subRepo.upsertSubscription(userId, {
            plan: SubscriptionPlan.PRO,
            status: SubscriptionStatus.ACTIVE,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId
          });
          logger.info(`BillingService: Successfully upgraded user [${userId}] to PRO plan via checkout.`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const customerId = dataObj.customer;
        const status = dataObj.status;
        const currentPeriodEnd = dataObj.current_period_end
          ? new Date(dataObj.current_period_end * 1000)
          : null;

        const sub = await this.subRepo.findByStripeCustomerId(customerId);
        if (sub) {
          const mappedStatus = status === 'active' ? SubscriptionStatus.ACTIVE
            : status === 'past_due' ? SubscriptionStatus.PAST_DUE
            : status === 'trialing' ? SubscriptionStatus.TRIALING
            : SubscriptionStatus.ACTIVE;

          await this.subRepo.upsertSubscription(sub.userId, {
            status: mappedStatus,
            currentPeriodEnd
          });
          logger.info(`BillingService: Updated subscription for user [${sub.userId}], status: ${mappedStatus}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const customerId = dataObj.customer;
        const sub = await this.subRepo.findByStripeCustomerId(customerId);
        if (sub) {
          await this.subRepo.upsertSubscription(sub.userId, {
            plan: SubscriptionPlan.FREE,
            status: SubscriptionStatus.CANCELED
          });
          logger.info(`BillingService: Downgraded user [${sub.userId}] to FREE plan following cancellation.`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const customerId = dataObj.customer;
        const sub = await this.subRepo.findByStripeCustomerId(customerId);
        if (sub) {
          await this.subRepo.upsertSubscription(sub.userId, {
            status: SubscriptionStatus.PAST_DUE
          });
          logger.warn(`BillingService: Payment failed for user [${sub.userId}], status set to PAST_DUE.`);
        }
        break;
      }

      default:
        logger.debug(`BillingService: Unhandled event type "${eventType}" ignored.`);
    }

    return { processed: true, eventType };
  }

  /**
   * Instant plan upgrade helper (used for dev testing, tenant switching & direct API)
   * @param {string} userId
   * @param {string} plan
   */
  async upgradeUserDirect(userId, plan = SubscriptionPlan.PRO) {
    if (!userId) {
      throw new ValidationError('User ID is required.');
    }

    const updated = await this.subRepo.updatePlan(
      userId,
      plan,
      SubscriptionStatus.ACTIVE,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    );

    logger.info(`BillingService: Directly updated plan for user [${userId}] to ${plan}`);
    return updated;
  }
}

export const billingService = new BillingService();
