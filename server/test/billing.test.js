/**
 * @file billing.test.js
 * Automated validation suite for Phase 13: Usage Tracking, Quotas & Stripe Billing.
 * Validates usage metering, subscription lifecycle, quota guardrails, and Stripe webhooks.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { UsageRepository } from '../src/repositories/UsageRepository.js';
import { SubscriptionRepository } from '../src/repositories/SubscriptionRepository.js';
import { UsageService } from '../src/services/UsageService.js';
import { QuotaService } from '../src/services/QuotaService.js';
import { BillingService } from '../src/services/BillingService.js';
import { StripeAdapter } from '../src/infrastructure/billing/StripeAdapter.js';
import { QuotaExceededError, ValidationError } from '../src/utils/AppError.js';
import { SubscriptionPlan, SubscriptionStatus, ErrorCodes } from '@kodra/shared';

describe('Phase 13: Usage Tracking, Quotas & Stripe Billing Test Suite', () => {

  // In-memory mock repositories for pure unit isolation
  class MockUsageRepo {
    constructor() {
      this.store = new Map();
    }
    getCurrentPeriodKey() {
      return '2026-10';
    }
    async getOrCreateUsage(userId, period = '2026-10') {
      const key = `${userId}:${period}`;
      if (!this.store.has(key)) {
        this.store.set(key, { userId, periodYearMonth: period, tokensUsed: 0, computeSecondsUsed: 0 });
      }
      return { ...this.store.get(key) };
    }
    async incrementUsage(userId, { tokens = 0, computeSeconds = 0 }, period = '2026-10') {
      const record = await this.getOrCreateUsage(userId, period);
      record.tokensUsed += tokens;
      record.computeSecondsUsed += computeSeconds;
      this.store.set(`${userId}:${period}`, record);
      return { ...record };
    }
    async resetUsage(userId, period = '2026-10') {
      const key = `${userId}:${period}`;
      if (this.store.has(key)) {
        const record = this.store.get(key);
        record.tokensUsed = 0;
        record.computeSecondsUsed = 0;
      }
    }
  }

  class MockSubscriptionRepo {
    constructor() {
      this.store = new Map();
    }
    async getSubscription(userId) {
      if (!this.store.has(userId)) {
        this.store.set(userId, {
          userId,
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodEnd: null
        });
      }
      return { ...this.store.get(userId) };
    }
    async upsertSubscription(userId, data) {
      const existing = await this.getSubscription(userId);
      const updated = { ...existing, ...data };
      this.store.set(userId, updated);
      return { ...updated };
    }
    async findByStripeCustomerId(customerId) {
      for (const sub of this.store.values()) {
        if (sub.stripeCustomerId === customerId) return { ...sub };
      }
      return null;
    }
    async updatePlan(userId, plan, status = SubscriptionStatus.ACTIVE, currentPeriodEnd = null) {
      return this.upsertSubscription(userId, { plan, status, currentPeriodEnd });
    }
  }

  class MockProjectRepo {
    constructor(projectCount = 1) {
      this.count = projectCount;
    }
    async listByOwner(ownerId) {
      return { projects: [], total: this.count };
    }
  }

  const mockUsageRepo = new MockUsageRepo();
  const mockSubRepo = new MockSubscriptionRepo();
  const mockProjectRepo = new MockProjectRepo(2);

  const usageService = new UsageService(mockUsageRepo);
  const quotaService = new QuotaService(mockSubRepo, mockUsageRepo, mockProjectRepo);
  const stripeAdapter = new StripeAdapter({
    stripeSecretKey: '', // Dev/mock mode
    stripeWebhookSecret: '',
    stripePriceIdProMonthly: 'price_pro_test'
  });
  const billingService = new BillingService(stripeAdapter, mockSubRepo, quotaService);

  describe('1. Usage Metering & Formatting (UsageService)', () => {
    it('should initialize usage record with zero consumption for new user', async () => {
      const summary = await usageService.getUsageSummary('user-alice-13');
      assert.equal(summary.userId, 'user-alice-13');
      assert.equal(summary.tokensUsed, 0);
      assert.equal(summary.computeSecondsUsed, 0);
      assert.equal(summary.computeHoursUsed, 0);
    });

    it('should atomically record and aggregate token usage', async () => {
      await usageService.recordTokens('user-alice-13', 2500);
      await usageService.recordTokens('user-alice-13', 1500);

      const usage = await usageService.getUsage('user-alice-13');
      assert.equal(usage.tokensUsed, 4000);
    });

    it('should record compute seconds and calculate fractional hours cleanly', async () => {
      await usageService.recordComputeSeconds('user-alice-13', 7200); // 2 hours
      const summary = await usageService.getUsageSummary('user-alice-13');

      assert.equal(summary.computeSecondsUsed, 7200);
      assert.equal(summary.computeHoursUsed, 2.0);
    });
  });

  describe('2. Quota Guardrails & Enforcement (QuotaService)', () => {
    it('should return default Free tier limits for new user', async () => {
      const status = await quotaService.getUserQuotaStatus('user-bob-13');

      assert.equal(status.plan, SubscriptionPlan.FREE);
      assert.equal(status.limits.maxTokensMonthly, 50000);
      assert.equal(status.limits.maxSandboxHoursMonthly, 10);
      assert.equal(status.limits.maxProjects, 3);
      assert.equal(status.status.isAnyExceeded, false);
    });

    it('should permit operations when within quota boundaries', async () => {
      await assert.doesNotReject(() => quotaService.enforceProjectCreationQuota('user-bob-13'));
      await assert.doesNotReject(() => quotaService.enforceTokenQuota('user-bob-13', 1000));
      await assert.doesNotReject(() => quotaService.enforceComputeQuota('user-bob-13'));
    });

    it('should block and throw QuotaExceededError when project quota is exceeded', async () => {
      const quotaSvcCapped = new QuotaService(mockSubRepo, mockUsageRepo, new MockProjectRepo(3));

      await assert.rejects(
        () => quotaSvcCapped.enforceProjectCreationQuota('user-bob-13'),
        (err) => {
          assert.ok(err instanceof QuotaExceededError);
          assert.equal(err.statusCode, 402);
          assert.equal(err.errorCode, ErrorCodes.QUOTA_EXCEEDED);
          assert.ok(err.message.includes('Project quota limit reached'));
          return true;
        }
      );
    });

    it('should block and throw QuotaExceededError when token quota is exceeded', async () => {
      // Simulate exhausting 50,000 tokens on Free tier
      await usageService.recordTokens('user-charlie-13', 50000);

      await assert.rejects(
        () => quotaService.enforceTokenQuota('user-charlie-13', 500),
        (err) => {
          assert.ok(err instanceof QuotaExceededError);
          assert.equal(err.statusCode, 402);
          assert.ok(err.message.includes('token quota exhausted'));
          return true;
        }
      );
    });

    it('should block and throw QuotaExceededError when compute hours are exhausted', async () => {
      // Simulate exhausting 10 hours (36,000 seconds) on Free tier
      await usageService.recordComputeSeconds('user-charlie-13', 36000);

      await assert.rejects(
        () => quotaService.enforceComputeQuota('user-charlie-13'),
        (err) => {
          assert.ok(err instanceof QuotaExceededError);
          assert.equal(err.statusCode, 402);
          assert.ok(err.message.includes('compute quota exhausted'));
          return true;
        }
      );
    });
  });

  describe('3. Stripe Infrastructure & Billing Life Cycle (BillingService)', () => {
    it('should create mock checkout session in development mode', async () => {
      const session = await billingService.createCheckoutSession({
        userId: 'user-upgrade-1',
        email: 'upgrade@kodra.dev',
        returnUrl: 'http://localhost:5173/dashboard'
      });

      assert.ok(session.sessionId.startsWith('cs_mock_'));
      assert.ok(session.url.includes('session_id='));
      assert.ok(session.url.includes('checkout_success=true'));
    });

    it('should upgrade user to PRO plan upon checkout.session.completed webhook', async () => {
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: 'user-upgrade-1',
            customer: 'cus_test_123',
            subscription: 'sub_test_456'
          }
        }
      };

      const result = await billingService.handleWebhookEvent(webhookPayload);
      assert.equal(result.processed, true);

      const sub = await mockSubRepo.getSubscription('user-upgrade-1');
      assert.equal(sub.plan, SubscriptionPlan.PRO);
      assert.equal(sub.status, SubscriptionStatus.ACTIVE);
      assert.equal(sub.stripeCustomerId, 'cus_test_123');
      assert.equal(sub.stripeSubscriptionId, 'sub_test_456');
    });

    it('PRO user should have upgraded resource limits (2M tokens, 200 compute hours)', async () => {
      const status = await quotaService.getUserQuotaStatus('user-upgrade-1');

      assert.equal(status.plan, SubscriptionPlan.PRO);
      assert.equal(status.limits.maxTokensMonthly, 2000000);
      assert.equal(status.limits.maxSandboxHoursMonthly, 200);
      assert.equal(status.limits.maxProjects, 50);
    });

    it('should downgrade user to FREE plan upon customer.subscription.deleted webhook', async () => {
      const cancelWebhook = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_test_123'
          }
        }
      };

      await billingService.handleWebhookEvent(cancelWebhook);

      const sub = await mockSubRepo.getSubscription('user-upgrade-1');
      assert.equal(sub.plan, SubscriptionPlan.FREE);
      assert.equal(sub.status, SubscriptionStatus.CANCELED);
    });

    it('should mark subscription PAST_DUE on invoice.payment_failed webhook', async () => {
      // Re-assign customer ID for test
      await mockSubRepo.upsertSubscription('user-fail-1', {
        stripeCustomerId: 'cus_fail_789',
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE
      });

      const failureWebhook = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_fail_789'
          }
        }
      };

      await billingService.handleWebhookEvent(failureWebhook);

      const sub = await mockSubRepo.getSubscription('user-fail-1');
      assert.equal(sub.status, SubscriptionStatus.PAST_DUE);
    });
  });
});
