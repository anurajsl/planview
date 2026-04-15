import {
  Injectable, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SubscriptionEntity, TenantEntity } from '../database/entities';

/**
 * Razorpay Plan IDs — replace with real IDs from your Razorpay dashboard.
 * Create plans at: https://dashboard.razorpay.com/app/subscriptions/plans
 */
const RAZORPAY_PLANS: Record<string, { monthly: string; yearly: string }> = {
  pro: {
    monthly: 'plan_pro_monthly',    // Replace with real Razorpay plan IDs
    yearly: 'plan_pro_yearly',
  },
  enterprise: {
    monthly: 'plan_enterprise_monthly',
    yearly: 'plan_enterprise_yearly',
  },
};

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger('Razorpay');
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    @InjectRepository(SubscriptionEntity) private readonly subRepo: Repository<SubscriptionEntity>,
    @InjectRepository(TenantEntity) private readonly tenantRepo: Repository<TenantEntity>,
    private readonly config: ConfigService,
  ) {
    this.keyId = this.config.get('RAZORPAY_KEY_ID', '');
    this.keySecret = this.config.get('RAZORPAY_KEY_SECRET', '');
    this.webhookSecret = this.config.get('RAZORPAY_WEBHOOK_SECRET', '');
  }

  get isConfigured(): boolean {
    return !!(this.keyId && this.keySecret);
  }

  // ─── Razorpay API Helper ──────────────────────────────────

  private async razorpayRequest(method: string, path: string, body?: Record<string, any>) {
    const url = `https://api.razorpay.com/v1${path}`;
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const headers: Record<string, string> = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
      this.logger.error(`Razorpay API error: ${JSON.stringify(data)}`);
      throw new BadRequestException(data.error?.description || 'Razorpay API error');
    }
    return data;
  }

  // ─── Customer Management ──────────────────────────────────

  async createCustomer(tenantId: string, email: string, name: string) {
    const customer = await this.razorpayRequest('POST', '/customers', {
      name,
      email,
      notes: { tenant_id: tenantId },
    });
    return customer;
  }

  // ─── Subscription Creation ────────────────────────────────

  async createSubscription(
    tenantId: string,
    planTier: string,
    billing: 'monthly' | 'yearly',
  ) {
    if (!RAZORPAY_PLANS[planTier]) {
      throw new BadRequestException(`Invalid plan: ${planTier}`);
    }

    const sub = await this.subRepo.findOne({ where: { tenantId } });
    const planId = RAZORPAY_PLANS[planTier][billing];

    // Create Razorpay customer if not exists
    let customerId = sub?.razorpayCustomerId;
    if (!customerId) {
      const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
      const customer = await this.createCustomer(tenantId, `admin@${tenant?.slug || 'tenant'}.com`, tenant?.name || 'Tenant');
      customerId = customer.id;

      await this.subRepo.update({ tenantId }, { razorpayCustomerId: customerId });
    }

    // Create Razorpay subscription
    const rzpSub = await this.razorpayRequest('POST', '/subscriptions', {
      plan_id: planId,
      customer_id: customerId,
      total_count: billing === 'yearly' ? 10 : 120, // max billing cycles
      notes: { tenant_id: tenantId, plan_tier: planTier },
    });

    return {
      razorpaySubscriptionId: rzpSub.id,
      razorpayKeyId: this.keyId,
      provider: 'razorpay' as const,
    };
  }

  // ─── Webhook Processing ───────────────────────────────────

  async handleWebhook(event: { event: string; payload: any }) {
    const eventType = event.event;

    switch (eventType) {
      case 'subscription.activated': {
        const sub = event.payload.subscription?.entity;
        const tenantId = sub?.notes?.tenant_id;
        const planTier = sub?.notes?.plan_tier;
        if (tenantId && planTier) {
          await this.activatePlan(tenantId, planTier, sub.id, sub.plan_id);
        }
        break;
      }

      case 'subscription.charged': {
        const sub = event.payload.subscription?.entity;
        const tenantId = sub?.notes?.tenant_id;
        if (tenantId) {
          await this.syncSubscription(tenantId, sub);
        }
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.completed': {
        const sub = event.payload.subscription?.entity;
        const tenantId = sub?.notes?.tenant_id;
        if (tenantId) {
          await this.cancelPlan(tenantId);
        }
        break;
      }

      case 'subscription.halted':
      case 'subscription.pending': {
        const sub = event.payload.subscription?.entity;
        const tenantId = sub?.notes?.tenant_id;
        if (tenantId) {
          await this.subRepo.update({ tenantId }, { status: 'past_due' });
          this.logger.warn(`Subscription halted/pending for tenant ${tenantId}`);
        }
        break;
      }

      default:
        this.logger.log(`Unhandled Razorpay event: ${eventType}`);
    }
  }

  // ─── Webhook Signature Verification ───────────────────────

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) return true; // Skip in dev
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');
    return expected === signature;
  }

  // ─── Plan Management ──────────────────────────────────────

  private async activatePlan(tenantId: string, planTier: string, rzpSubId: string, rzpPlanId: string) {
    await this.subRepo.update(
      { tenantId },
      {
        paymentProvider: 'razorpay',
        razorpaySubscriptionId: rzpSubId,
        razorpayPlanId: rzpPlanId,
        planTier,
        status: 'active',
      },
    );

    const PLAN_LIMITS: Record<string, any> = {
      free: { maxProjects: 3, maxUsers: 5, maxStories: 50 },
      pro: { maxProjects: 25, maxUsers: 50, maxStories: 500 },
      enterprise: { maxProjects: -1, maxUsers: -1, maxStories: -1 },
    };

    await this.tenantRepo.update(
      { id: tenantId },
      {
        planTier,
        settings: () => `settings || '${JSON.stringify({ ...PLAN_LIMITS[planTier] })}'::jsonb`,
      },
    );

    this.logger.log(`Tenant ${tenantId} upgraded to ${planTier} via Razorpay`);
  }

  private async syncSubscription(tenantId: string, rzpSub: any) {
    const update: Partial<SubscriptionEntity> = {
      status: 'active',
    };

    if (rzpSub.current_start) {
      update.currentPeriodStart = new Date(rzpSub.current_start * 1000);
    }
    if (rzpSub.current_end) {
      update.currentPeriodEnd = new Date(rzpSub.current_end * 1000);
    }

    await this.subRepo.update({ tenantId }, update);
  }

  private async cancelPlan(tenantId: string) {
    await this.subRepo.update(
      { tenantId },
      {
        planTier: 'free',
        status: 'canceled',
        razorpaySubscriptionId: null,
        razorpayPlanId: null,
      },
    );
    await this.tenantRepo.update({ id: tenantId }, { planTier: 'free' });
    this.logger.log(`Tenant ${tenantId} downgraded to free (Razorpay)`);
  }

  // ─── Cancel Subscription ──────────────────────────────────

  async cancelSubscription(tenantId: string) {
    const sub = await this.subRepo.findOne({ where: { tenantId } });
    if (!sub?.razorpaySubscriptionId) {
      throw new BadRequestException('No active Razorpay subscription');
    }

    await this.razorpayRequest('POST', `/subscriptions/${sub.razorpaySubscriptionId}/cancel`, {
      cancel_at_cycle_end: 1,
    });

    await this.subRepo.update({ tenantId }, { cancelAtPeriodEnd: true });
    return { canceled: true };
  }
}
