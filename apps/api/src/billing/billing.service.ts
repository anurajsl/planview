import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  SubscriptionEntity, TenantEntity, ProjectEntity, UserEntity, StoryEntity,
} from '../database/entities';

/**
 * BillingService
 *
 * Handles all Stripe integration:
 * - Creating Stripe customers on tenant registration
 * - Generating checkout sessions for plan upgrades
 * - Managing billing portal for self-service
 * - Processing webhooks for subscription lifecycle
 * - Enforcing plan limits
 * - Usage metering
 *
 * NOTE: This uses the Stripe API via fetch() to avoid adding stripe as a
 * dependency. In production, swap for the official `stripe` npm package.
 */

const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  pro: {
    monthly: 'price_pro_monthly',    // Replace with real Stripe price IDs
    yearly: 'price_pro_yearly',
  },
  enterprise: {
    monthly: 'price_enterprise_monthly',
    yearly: 'price_enterprise_yearly',
  },
};

const PLAN_LIMITS: Record<string, { maxProjects: number; maxUsers: number; maxStories: number }> = {
  free: { maxProjects: 3, maxUsers: 5, maxStories: 50 },
  pro: { maxProjects: 25, maxUsers: 50, maxStories: 500 },
  enterprise: { maxProjects: -1, maxUsers: -1, maxStories: -1 },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger('Billing');
  private readonly stripeKey: string;
  private readonly stripeWebhookSecret: string;

  constructor(
    @InjectRepository(SubscriptionEntity) private readonly subRepo: Repository<SubscriptionEntity>,
    @InjectRepository(TenantEntity) private readonly tenantRepo: Repository<TenantEntity>,
    @InjectRepository(ProjectEntity) private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(StoryEntity) private readonly storyRepo: Repository<StoryEntity>,
    private readonly config: ConfigService,
  ) {
    this.stripeKey = this.config.get('STRIPE_SECRET_KEY', 'sk_test_placeholder');
    this.stripeWebhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET', 'whsec_placeholder');
  }

  // ─── Stripe API Helper ────────────────────────────────────

  private async stripeRequest(method: string, path: string, body?: Record<string, any>) {
    const url = `https://api.stripe.com/v1${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = new URLSearchParams(
        Object.entries(body).reduce((acc, [k, v]) => {
          if (v !== undefined && v !== null) acc[k] = String(v);
          return acc;
        }, {} as Record<string, string>),
      ).toString();
    }

    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
      this.logger.error(`Stripe API error: ${JSON.stringify(data)}`);
      throw new BadRequestException(data.error?.message || 'Stripe API error');
    }
    return data;
  }

  // ─── Customer Management ──────────────────────────────────

  /**
   * Create a Stripe customer for a new tenant.
   * Called during tenant registration (only if Stripe is configured).
   */
  async createCustomer(tenantId: string, email: string, tenantName: string) {
    if (!this.stripeKey || this.stripeKey === 'sk_test_placeholder') {
      // Stripe not configured — create free subscription without Stripe
      const subscription = this.subRepo.create({
        tenantId,
        paymentProvider: 'none',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        planTier: 'free',
        status: 'active',
      });
      return this.subRepo.save(subscription);
    }

    // Create Stripe customer
    const customer = await this.stripeRequest('POST', '/customers', {
      email,
      name: tenantName,
      'metadata[tenant_id]': tenantId,
    });

    // Create subscription record (starts on free plan)
    const subscription = this.subRepo.create({
      tenantId,
      paymentProvider: 'stripe',
      stripeCustomerId: customer.id,
      stripeSubscriptionId: null,
      planTier: 'free',
      status: 'active',
    });
    await this.subRepo.save(subscription);

    return subscription;
  }

  // ─── Checkout ─────────────────────────────────────────────

  /**
   * Create a Stripe Checkout session for plan upgrade.
   */
  async createCheckoutSession(
    tenantId: string,
    planTier: string,
    billing: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string,
  ) {
    if (!PLAN_PRICES[planTier]) {
      throw new BadRequestException(`Invalid plan: ${planTier}`);
    }

    const sub = await this.getSubscription(tenantId);
    const priceId = PLAN_PRICES[planTier][billing];

    const session = await this.stripeRequest('POST', '/checkout/sessions', {
      customer: sub.stripeCustomerId,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      'metadata[tenant_id]': tenantId,
      'metadata[plan_tier]': planTier,
      'subscription_data[metadata][tenant_id]': tenantId,
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // ─── Billing Portal ───────────────────────────────────────

  /**
   * Create a Stripe Billing Portal session for self-service.
   */
  async createPortalSession(tenantId: string, returnUrl: string) {
    const sub = await this.getSubscription(tenantId);

    const session = await this.stripeRequest('POST', '/billing_portal/sessions', {
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return { portalUrl: session.url };
  }

  // ─── Webhook Processing ───────────────────────────────────

  /**
   * Process Stripe webhook events.
   * Called by WebhookController with raw body for signature verification.
   */
  async handleWebhook(event: { type: string; data: { object: any } }) {
    const obj = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed': {
        const tenantId = obj.metadata?.tenant_id;
        const planTier = obj.metadata?.plan_tier;
        if (tenantId && planTier) {
          await this.activatePlan(tenantId, planTier, obj.subscription);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const tenantId = obj.metadata?.tenant_id;
        if (tenantId) {
          await this.syncSubscription(tenantId, obj);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const tenantId = obj.metadata?.tenant_id;
        if (tenantId) {
          await this.cancelPlan(tenantId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const tenantId = obj.subscription_details?.metadata?.tenant_id
          || obj.metadata?.tenant_id;
        if (tenantId) {
          await this.subRepo.update(
            { tenantId },
            { status: 'past_due' },
          );
          this.logger.warn(`Payment failed for tenant ${tenantId}`);
        }
        break;
      }

      default:
        this.logger.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  // ─── Plan Management ──────────────────────────────────────

  private async activatePlan(tenantId: string, planTier: string, stripeSubId: string) {
    await this.subRepo.update(
      { tenantId },
      {
        paymentProvider: 'stripe',
        planTier,
        stripeSubscriptionId: stripeSubId,
        status: 'active',
      },
    );

    // Update tenant settings with new plan limits
    await this.tenantRepo.update(
      { id: tenantId },
      {
        planTier,
        settings: () => `settings || '${JSON.stringify({ ...PLAN_LIMITS[planTier] })}'::jsonb`,
      },
    );

    this.logger.log(`Tenant ${tenantId} upgraded to ${planTier}`);
  }

  private async syncSubscription(tenantId: string, stripeObj: any) {
    const update: Partial<SubscriptionEntity> = {
      status: stripeObj.status,
      cancelAtPeriodEnd: stripeObj.cancel_at_period_end,
    };

    if (stripeObj.current_period_start) {
      update.currentPeriodStart = new Date(stripeObj.current_period_start * 1000);
    }
    if (stripeObj.current_period_end) {
      update.currentPeriodEnd = new Date(stripeObj.current_period_end * 1000);
    }

    await this.subRepo.update({ tenantId }, update);
  }

  private async cancelPlan(tenantId: string) {
    await this.subRepo.update(
      { tenantId },
      { planTier: 'free', status: 'canceled', stripeSubscriptionId: null },
    );
    await this.tenantRepo.update(
      { id: tenantId },
      { planTier: 'free' },
    );
    this.logger.log(`Tenant ${tenantId} downgraded to free`);
  }

  // ─── Usage & Limits ───────────────────────────────────────

  async getSubscription(tenantId: string) {
    const sub = await this.subRepo.findOne({ where: { tenantId } });
    if (!sub) {
      // Auto-create free subscription if missing
      return this.subRepo.save(this.subRepo.create({
        tenantId,
        paymentProvider: 'none',
        stripeCustomerId: null,
        planTier: 'free',
        status: 'active',
      }));
    }
    return sub;
  }

  async getUsage(tenantId: string) {
    const sub = await this.getSubscription(tenantId);
    const limits = PLAN_LIMITS[sub.planTier] || PLAN_LIMITS.free;

    const [projectCount, userCount, maxStories] = await Promise.all([
      this.projectRepo.count({ where: { tenantId } }),
      this.userRepo.count({ where: { tenantId } }),
      this.storyRepo
        .createQueryBuilder('s')
        .select('s.project_id')
        .addSelect('COUNT(*)', 'cnt')
        .where('s.tenant_id = :tenantId', { tenantId })
        .groupBy('s.project_id')
        .orderBy('cnt', 'DESC')
        .limit(1)
        .getRawOne()
        .then((r) => parseInt(r?.cnt || '0', 10)),
    ]);

    const pct = (used: number, max: number) =>
      max === -1 ? 0 : Math.round((used / max) * 100);

    return {
      planTier: sub.planTier,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      currentPeriodEnd: sub.currentPeriodEnd,
      limits,
      usage: {
        projects: projectCount,
        users: userCount,
        storiesInLargestProject: maxStories,
      },
      percentages: {
        projects: pct(projectCount, limits.maxProjects),
        users: pct(userCount, limits.maxUsers),
        stories: pct(maxStories, limits.maxStories),
      },
    };
  }

  /**
   * Check if a specific action is within plan limits.
   * Throws ForbiddenException if limit exceeded.
   */
  async enforceLimit(tenantId: string, resource: 'project' | 'user' | 'story', projectId?: string) {
    const usage = await this.getUsage(tenantId);
    const limits = usage.limits;

    switch (resource) {
      case 'project':
        if (limits.maxProjects !== -1 && usage.usage.projects >= limits.maxProjects) {
          throw new ForbiddenException(
            `Plan limit reached: ${limits.maxProjects} projects on ${usage.planTier} plan. Upgrade to add more.`,
          );
        }
        break;
      case 'user':
        if (limits.maxUsers !== -1 && usage.usage.users >= limits.maxUsers) {
          throw new ForbiddenException(
            `Plan limit reached: ${limits.maxUsers} users on ${usage.planTier} plan. Upgrade to add more.`,
          );
        }
        break;
      case 'story':
        if (projectId && limits.maxStories !== -1) {
          const storyCount = await this.storyRepo.count({ where: { tenantId, projectId } });
          if (storyCount >= limits.maxStories) {
            throw new ForbiddenException(
              `Plan limit reached: ${limits.maxStories} stories per project on ${usage.planTier} plan. Upgrade to add more.`,
            );
          }
        }
        break;
    }
  }
}
