/**
 * @file UsageRepository.js
 * Layer 3: Data Access - Isolates database operations for monthly user resource consumption.
 */

import { UserUsage } from '../models/UserUsage.js';

export class UsageRepository {
  /**
   * Helper to format current month key (e.g. "2026-10")
   * @param {Date} [date]
   * @returns {string}
   */
  getCurrentPeriodKey(date = new Date()) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Find or initialize usage record for specified user and monthly cycle
   * @param {string} userId
   * @param {string} [periodYearMonth]
   * @returns {Promise<object>}
   */
  async getOrCreateUsage(userId, periodYearMonth = this.getCurrentPeriodKey()) {
    let usage = await UserUsage.findOne({ userId, periodYearMonth }).lean();

    if (!usage) {
      try {
        usage = await UserUsage.create({
          userId,
          periodYearMonth,
          tokensUsed: 0,
          computeSecondsUsed: 0
        });
        usage = usage.toObject ? usage.toObject() : usage;
      } catch (err) {
        // Handle race conditions where another request created the record simultaneously
        if (err.code === 11000) {
          usage = await UserUsage.findOne({ userId, periodYearMonth }).lean();
        } else {
          throw err;
        }
      }
    }

    return usage;
  }

  /**
   * Atomically increment consumed tokens and/or compute seconds
   * @param {string} userId
   * @param {object} increments
   * @param {number} [increments.tokens]
   * @param {number} [increments.computeSeconds]
   * @param {string} [periodYearMonth]
   * @returns {Promise<object>}
   */
  async incrementUsage(userId, { tokens = 0, computeSeconds = 0 }, periodYearMonth = this.getCurrentPeriodKey()) {
    const incObj = {};
    if (tokens > 0) incObj.tokensUsed = tokens;
    if (computeSeconds > 0) incObj.computeSecondsUsed = computeSeconds;

    if (Object.keys(incObj).length === 0) {
      return this.getOrCreateUsage(userId, periodYearMonth);
    }

    const updated = await UserUsage.findOneAndUpdate(
      { userId, periodYearMonth },
      { $inc: incObj },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return updated;
  }

  /**
   * Fetch usage record for a given billing period
   * @param {string} userId
   * @param {string} [periodYearMonth]
   * @returns {Promise<object|null>}
   */
  async getMonthlyUsage(userId, periodYearMonth = this.getCurrentPeriodKey()) {
    return await UserUsage.findOne({ userId, periodYearMonth }).lean();
  }

  /**
   * Reset usage for a period (useful for testing and admin overrides)
   * @param {string} userId
   * @param {string} [periodYearMonth]
   */
  async resetUsage(userId, periodYearMonth = this.getCurrentPeriodKey()) {
    return await UserUsage.findOneAndUpdate(
      { userId, periodYearMonth },
      { $set: { tokensUsed: 0, computeSecondsUsed: 0 } },
      { new: true }
    ).lean();
  }
}

export const usageRepository = new UsageRepository();
