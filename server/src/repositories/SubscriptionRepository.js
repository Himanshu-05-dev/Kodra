/**
 * @file SubscriptionRepository.js
 * Layer 3: Data Access - Isolates database operations for User Subscriptions & Plans.
 */

import { Subscription } from '../models/Subscription.js';
import { SubscriptionPlan, SubscriptionStatus } from '@kodra/shared';

export class SubscriptionRepository {
  /**
   * Get subscription by userId, returning a default FREE plan if none exists
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getSubscription(userId) {
    if (!userId) {
      return {
        userId: 'anonymous',
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null
      };
    }

    let sub = await Subscription.findOne({ userId }).lean();

    if (!sub) {
      try {
        sub = await Subscription.create({
          userId,
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodEnd: null
        });
        sub = sub.toObject ? sub.toObject() : sub;
      } catch (err) {
        if (err.code === 11000) {
          sub = await Subscription.findOne({ userId }).lean();
        } else {
          // If database is not active, return default free object
          return {
            userId,
            plan: SubscriptionPlan.FREE,
            status: SubscriptionStatus.ACTIVE,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            currentPeriodEnd: null
          };
        }
      }
    }

    return sub;
  }

  /**
   * Create or update subscription record
   * @param {string} userId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async upsertSubscription(userId, data) {
    return await Subscription.findOneAndUpdate(
      { userId },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }

  /**
   * Find subscription by Stripe customer ID
   * @param {string} stripeCustomerId
   * @returns {Promise<object|null>}
   */
  async findByStripeCustomerId(stripeCustomerId) {
    return await Subscription.findOne({ stripeCustomerId }).lean();
  }

  /**
   * Find subscription by Stripe subscription ID
   * @param {string} stripeSubscriptionId
   * @returns {Promise<object|null>}
   */
  async findByStripeSubscriptionId(stripeSubscriptionId) {
    return await Subscription.findOne({ stripeSubscriptionId }).lean();
  }

  /**
   * Update plan and status
   * @param {string} userId
   * @param {string} plan
   * @param {string} [status]
   * @param {Date} [currentPeriodEnd]
   * @returns {Promise<object>}
   */
  async updatePlan(userId, plan, status = SubscriptionStatus.ACTIVE, currentPeriodEnd = null) {
    const update = { plan, status };
    if (currentPeriodEnd) update.currentPeriodEnd = currentPeriodEnd;

    return await Subscription.findOneAndUpdate(
      { userId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }
}

export const subscriptionRepository = new SubscriptionRepository();
