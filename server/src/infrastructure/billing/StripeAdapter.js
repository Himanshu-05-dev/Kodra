/**
 * @file StripeAdapter.js
 * Layer 4: Infrastructure Adapter - Centralized Stripe Payment & Subscription Gateway.
 * Provides high-level abstractions for customer creation, checkout sessions,
 * billing portal redirection, and webhook signature verification with dev/mock fallback.
 */

import Stripe from 'stripe';
import { config } from '../../config/index.js';
import { logger } from '../logger/logger.js';
import { ValidationError, InfrastructureError } from '../../utils/AppError.js';

export class StripeAdapter {
  constructor(cfg = config.billing) {
    this.config = cfg;
    this.isLive = Boolean(this.config.stripeSecretKey);

    if (this.isLive) {
      this.client = new Stripe(this.config.stripeSecretKey, {
        apiVersion: '2024-06-20'
      });
      logger.info('StripeAdapter: Initialized with live secret key.');
    } else {
      this.client = null;
      logger.info('StripeAdapter: Running in Development/Mock Mode (no STRIPE_SECRET_KEY set).');
    }
  }

  /**
   * Determine if real Stripe credentials are bound
   */
  isConfigured() {
    return this.isLive;
  }

  /**
   * Create or retrieve a Stripe customer
   * @param {object} params
   * @param {string} params.uid
   * @param {string} params.email
   * @param {string} [params.name]
   * @returns {Promise<{ id: string, email: string }>}
   */
  async createCustomer({ uid, email, name = '' }) {
    if (!email) {
      throw new ValidationError('Customer email is required to create a billing account.');
    }

    if (!this.isLive) {
      // Mock customer generation for tests and local dev
      const mockCustomerId = `cus_mock_${uid || Math.random().toString(36).substring(2, 9)}`;
      logger.debug(`StripeAdapter [MOCK]: Created customer ${mockCustomerId} for ${email}`);
      return { id: mockCustomerId, email };
    }

    try {
      const customer = await this.client.customers.create({
        email,
        name: name || undefined,
        metadata: {
          kodraUserId: uid
        }
      });
      return { id: customer.id, email: customer.email };
    } catch (err) {
      logger.error(`Stripe customer creation failed: ${err.message}`);
      throw new InfrastructureError(`Failed to create billing customer: ${err.message}`);
    }
  }

  /**
   * Create a Stripe Checkout Session for subscription upgrade
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.customerEmail
   * @param {string} [params.customerId]
   * @param {string} [params.priceId]
   * @param {string} params.successUrl
   * @param {string} params.cancelUrl
   * @returns {Promise<{ sessionId: string, url: string }>}
   */
  async createCheckoutSession({
    userId,
    customerEmail,
    customerId,
    priceId = this.config.stripePriceIdProMonthly,
    successUrl,
    cancelUrl
  }) {
    if (!this.isLive) {
      // Mock session redirect
      const mockSessionId = `cs_mock_${Date.now()}`;
      const mockUrl = `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id=${mockSessionId}&mock=true`;
      logger.debug(`StripeAdapter [MOCK]: Generated mock checkout session ${mockSessionId}`);
      return { sessionId: mockSessionId, url: mockUrl };
    }

    try {
      const sessionParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: {
          kodraUserId: userId
        }
      };

      if (customerId) {
        sessionParams.customer = customerId;
      } else {
        sessionParams.customer_email = customerEmail;
      }

      const session = await this.client.checkout.sessions.create(sessionParams);
      return { sessionId: session.id, url: session.url };
    } catch (err) {
      logger.error(`Stripe checkout session failed: ${err.message}`);
      throw new InfrastructureError(`Failed to initiate subscription checkout: ${err.message}`);
    }
  }

  /**
   * Create a Stripe Customer Portal session for subscription management
   * @param {string} customerId
   * @param {string} returnUrl
   * @returns {Promise<{ url: string }>}
   */
  async createPortalSession(customerId, returnUrl) {
    if (!this.isLive || !customerId || customerId.startsWith('cus_mock_')) {
      logger.debug(`StripeAdapter [MOCK]: Customer portal requested for ${customerId}`);
      return { url: `${returnUrl}?portal_mock=true` };
    }

    try {
      const session = await this.client.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });
      return { url: session.url };
    } catch (err) {
      logger.error(`Stripe portal session failed: ${err.message}`);
      throw new InfrastructureError(`Failed to open billing portal: ${err.message}`);
    }
  }

  /**
   * Verify and construct incoming webhook event
   * @param {Buffer|string} payload
   * @param {string} signature
   * @returns {object} Stripe event
   */
  constructWebhookEvent(payload, signature) {
    if (!this.isLive) {
      // In dev or test mode, parse payload if JSON
      if (typeof payload === 'string' || Buffer.isBuffer(payload)) {
        try {
          return JSON.parse(payload.toString());
        } catch {
          return { type: 'unknown', data: { object: {} } };
        }
      }
      return payload;
    }

    if (!this.config.stripeWebhookSecret) {
      throw new ValidationError('STRIPE_WEBHOOK_SECRET is not configured on the server.');
    }

    try {
      return this.client.webhooks.constructEvent(
        payload,
        signature,
        this.config.stripeWebhookSecret
      );
    } catch (err) {
      logger.error(`Stripe webhook signature validation failed: ${err.message}`);
      throw new ValidationError(`Webhook signature verification failed: ${err.message}`);
    }
  }
}

export const stripeAdapter = new StripeAdapter();
