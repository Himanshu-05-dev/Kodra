/**
 * @file UsageService.js
 * Layer 2: Business Logic - Manages Resource Metering (AI Tokens, Compute Time).
 */

import { usageRepository as defaultUsageRepo } from '../repositories/UsageRepository.js';
import { logger } from '../infrastructure/logger/logger.js';

export class UsageService {
  /**
   * @param {import('../repositories/UsageRepository.js').UsageRepository} [usageRepo]
   */
  constructor(usageRepo = defaultUsageRepo) {
    this.usageRepo = usageRepo;
  }

  /**
   * Ingest and record consumed AI tokens
   * @param {string} userId
   * @param {number} tokenCount
   * @param {string} [periodYearMonth]
   */
  async recordTokens(userId, tokenCount, periodYearMonth) {
    if (!userId || typeof tokenCount !== 'number' || tokenCount <= 0) {
      return null;
    }

    const updated = await this.usageRepo.incrementUsage(
      userId,
      { tokens: Math.round(tokenCount) },
      periodYearMonth
    );

    logger.debug(`UsageService: Recorded ${tokenCount} tokens for user [${userId}]`);
    return updated;
  }

  /**
   * Ingest and record consumed sandbox compute runtime
   * @param {string} userId
   * @param {number} seconds
   * @param {string} [periodYearMonth]
   */
  async recordComputeSeconds(userId, seconds, periodYearMonth) {
    if (!userId || typeof seconds !== 'number' || seconds <= 0) {
      return null;
    }

    const updated = await this.usageRepo.incrementUsage(
      userId,
      { computeSeconds: Math.round(seconds) },
      periodYearMonth
    );

    logger.debug(`UsageService: Recorded ${seconds}s compute time for user [${userId}]`);
    return updated;
  }

  /**
   * Fetch current monthly usage details
   * @param {string} userId
   * @param {string} [periodYearMonth]
   */
  async getUsage(userId, periodYearMonth) {
    return await this.usageRepo.getOrCreateUsage(userId, periodYearMonth);
  }

  /**
   * Get formatted usage summary with human-readable numbers
   * @param {string} userId
   * @param {string} [periodYearMonth]
   */
  async getUsageSummary(userId, periodYearMonth) {
    const usage = await this.getUsage(userId, periodYearMonth);
    const computeSeconds = usage.computeSecondsUsed || 0;
    const computeHours = parseFloat((computeSeconds / 3600).toFixed(2));

    return {
      userId: usage.userId,
      periodYearMonth: usage.periodYearMonth,
      tokensUsed: usage.tokensUsed || 0,
      computeSecondsUsed: computeSeconds,
      computeHoursUsed: computeHours,
      updatedAt: usage.updatedAt
    };
  }
}

export const usageService = new UsageService();
