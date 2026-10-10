/**
 * @file QuotaService.js
 * Layer 2: Business Logic - Enforces Commercial Resource Limits and Tier Guardrails.
 */

import { subscriptionRepository as defaultSubRepo } from '../repositories/SubscriptionRepository.js';
import { usageRepository as defaultUsageRepo } from '../repositories/UsageRepository.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { config } from '../config/index.js';
import { QuotaExceededError } from '../utils/AppError.js';
import { SubscriptionPlan } from '@kodra/shared';
import { logger } from '../infrastructure/logger/logger.js';

export class QuotaService {
  /**
   * @param {import('../repositories/SubscriptionRepository.js').SubscriptionRepository} [subRepo]
   * @param {import('../repositories/UsageRepository.js').UsageRepository} [usageRepo]
   * @param {ProjectRepository} [projectRepo]
   */
  constructor(
    subRepo = defaultSubRepo,
    usageRepo = defaultUsageRepo,
    projectRepo = new ProjectRepository()
  ) {
    this.subRepo = subRepo;
    this.usageRepo = usageRepo;
    this.projectRepo = projectRepo;
    this.tiers = config.billing.tiers;
  }

  /**
   * Retrieve configured limits for a given plan tier
   * @param {string} plan
   */
  getPlanLimits(plan = SubscriptionPlan.FREE) {
    const normalizedPlan = (plan || SubscriptionPlan.FREE).toLowerCase();
    const limits = this.tiers[normalizedPlan] || this.tiers.free;

    return {
      plan: normalizedPlan,
      maxTokensMonthly: limits.maxTokensMonthly,
      maxSandboxHoursMonthly: limits.maxSandboxHoursMonthly,
      maxProjects: limits.maxProjects
    };
  }

  /**
   * Inspect current usage vs tier quotas for a user
   * @param {string} userId
   */
  async getUserQuotaStatus(userId) {
    const subscription = await this.subRepo.getSubscription(userId);
    const plan = subscription?.plan || SubscriptionPlan.FREE;
    const limits = this.getPlanLimits(plan);

    const usage = await this.usageRepo.getOrCreateUsage(userId);
    const tokensUsed = usage.tokensUsed || 0;
    const computeSeconds = usage.computeSecondsUsed || 0;
    const computeHoursUsed = parseFloat((computeSeconds / 3600).toFixed(2));

    const { total: projectCount } = await this.projectRepo.listByOwner(userId);

    const tokenPercentage = Math.min(100, Math.round((tokensUsed / limits.maxTokensMonthly) * 100));
    const computePercentage = Math.min(100, Math.round((computeHoursUsed / limits.maxSandboxHoursMonthly) * 100));
    const projectPercentage = Math.min(100, Math.round((projectCount / limits.maxProjects) * 100));

    const isTokenExceeded = tokensUsed >= limits.maxTokensMonthly;
    const isComputeExceeded = computeHoursUsed >= limits.maxSandboxHoursMonthly;
    const isProjectExceeded = projectCount >= limits.maxProjects;
    const isAnyExceeded = isTokenExceeded || isComputeExceeded || isProjectExceeded;

    return {
      userId,
      plan,
      subscriptionStatus: subscription?.status || 'active',
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      usage: {
        tokensUsed,
        computeSecondsUsed: computeSeconds,
        computeHoursUsed,
        projectCount
      },
      limits,
      percentages: {
        tokens: tokenPercentage,
        compute: computePercentage,
        projects: projectPercentage
      },
      status: {
        isTokenExceeded,
        isComputeExceeded,
        isProjectExceeded,
        isAnyExceeded,
        upgradeRecommended: isAnyExceeded || tokenPercentage >= 80 || computePercentage >= 80
      }
    };
  }

  /**
   * Guard project creation against workspace quota exhaustion
   * @param {string} userId
   */
  async enforceProjectCreationQuota(userId) {
    const status = await this.getUserQuotaStatus(userId);

    if (status.status.isProjectExceeded) {
      logger.warn(`User [${userId}] blocked by Project Quota: (${status.usage.projectCount}/${status.limits.maxProjects})`);
      throw new QuotaExceededError(
        `Project quota limit reached (${status.usage.projectCount}/${status.limits.maxProjects} projects). Upgrade to Pro to create more projects.`,
        [
          {
            resource: 'projects',
            current: status.usage.projectCount,
            limit: status.limits.maxProjects,
            plan: status.plan
          }
        ]
      );
    }

    return true;
  }

  /**
   * Guard AI agent runs against token quota exhaustion
   * @param {string} userId
   * @param {number} [estimatedTokens=1000]
   */
  async enforceTokenQuota(userId, estimatedTokens = 1000) {
    const status = await this.getUserQuotaStatus(userId);

    if (status.status.isTokenExceeded || (status.usage.tokensUsed + estimatedTokens > status.limits.maxTokensMonthly)) {
      logger.warn(`User [${userId}] blocked by Token Quota: (${status.usage.tokensUsed}/${status.limits.maxTokensMonthly})`);
      throw new QuotaExceededError(
        `Monthly AI token quota exhausted (${status.usage.tokensUsed.toLocaleString()} / ${status.limits.maxTokensMonthly.toLocaleString()} tokens). Upgrade to Pro for 2,000,000 monthly tokens.`,
        [
          {
            resource: 'tokens',
            current: status.usage.tokensUsed,
            limit: status.limits.maxTokensMonthly,
            plan: status.plan
          }
        ]
      );
    }

    return true;
  }

  /**
   * Guard sandbox execution against compute quota exhaustion
   * @param {string} userId
   */
  async enforceComputeQuota(userId) {
    const status = await this.getUserQuotaStatus(userId);

    if (status.status.isComputeExceeded) {
      logger.warn(`User [${userId}] blocked by Compute Quota: (${status.usage.computeHoursUsed}/${status.limits.maxSandboxHoursMonthly} hrs)`);
      throw new QuotaExceededError(
        `Monthly sandbox compute quota exhausted (${status.usage.computeHoursUsed} / ${status.limits.maxSandboxHoursMonthly} hours). Upgrade to Pro for 200 compute hours.`,
        [
          {
            resource: 'computeHours',
            current: status.usage.computeHoursUsed,
            limit: status.limits.maxSandboxHoursMonthly,
            plan: status.plan
          }
        ]
      );
    }

    return true;
  }
}

export const quotaService = new QuotaService();
