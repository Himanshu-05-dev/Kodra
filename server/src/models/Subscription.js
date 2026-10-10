/**
 * @file Subscription.js
 * Layer 3: Model - Mongoose Subscription & Plan Entity Schema.
 * Tracks user commercial plan tiers, Stripe IDs, and lifecycle status.
 */

import mongoose from 'mongoose';
import { SubscriptionPlan, SubscriptionStatus } from '@kodra/shared';

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    plan: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      default: SubscriptionPlan.FREE,
      index: true
    },
    stripeCustomerId: {
      type: String,
      default: null,
      index: true
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
      index: true
    },
    currentPeriodEnd: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
