import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { RazorpayService } from './razorpay.service';
import { TenantId, Roles } from '../common/decorators';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly razorpayService: RazorpayService,
  ) {}

  @Get('usage')
  @ApiOperation({ summary: 'Get current plan usage and limits' })
  async getUsage(@TenantId() tenantId: string) {
    return this.billingService.getUsage(tenantId);
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get subscription details' })
  async getSubscription(@TenantId() tenantId: string) {
    return this.billingService.getSubscription(tenantId);
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get available payment providers' })
  async getProviders() {
    return {
      stripe: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'),
      razorpay: this.razorpayService.isConfigured,
    };
  }

  @Post('checkout')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create checkout session (Stripe or Razorpay)' })
  async createCheckout(
    @TenantId() tenantId: string,
    @Body() dto: {
      planTier: string;
      billing?: 'monthly' | 'yearly';
      provider?: 'stripe' | 'razorpay';
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    const provider = dto.provider || (this.razorpayService.isConfigured ? 'razorpay' : 'stripe');

    if (provider === 'razorpay') {
      return this.razorpayService.createSubscription(
        tenantId,
        dto.planTier,
        dto.billing || 'monthly',
      );
    }

    return this.billingService.createCheckoutSession(
      tenantId,
      dto.planTier,
      dto.billing || 'monthly',
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  @Post('portal')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create Stripe Billing Portal session' })
  async createPortal(
    @TenantId() tenantId: string,
    @Body() dto: { returnUrl: string },
  ) {
    return this.billingService.createPortalSession(tenantId, dto.returnUrl);
  }

  @Post('razorpay/verify')
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment after frontend checkout' })
  async verifyRazorpayPayment(
    @TenantId() tenantId: string,
    @Body() dto: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    },
  ) {
    const crypto = require('crypto');
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${dto.razorpay_payment_id}|${dto.razorpay_subscription_id}`)
      .digest('hex');

    if (expectedSig !== dto.razorpay_signature) {
      return { verified: false, error: 'Invalid signature' };
    }

    return { verified: true };
  }
}
