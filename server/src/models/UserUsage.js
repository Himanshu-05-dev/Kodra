/**
 * @file UserUsage.js
 * Layer 3: Model - Mongoose User Usage Entity Schema.
 * Tracks monthly aggregate AI tokens and compute runtime per tenant.
 */

import mongoose from 'mongoose';

const UserUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true
    },
    periodYearMonth: {
      type: String,
      required: [true, 'Period Year-Month (YYYY-MM) is required'],
      index: true
    },
    tokensUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    computeSecondsUsed: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound index to guarantee unique usage record per user per monthly billing cycle
UserUsageSchema.index({ userId: 1, periodYearMonth: 1 }, { unique: true });

export const UserUsage = mongoose.models.UserUsage || mongoose.model('UserUsage', UserUsageSchema);
