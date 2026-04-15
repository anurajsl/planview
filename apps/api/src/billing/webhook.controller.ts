import { Controller, Post, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { RazorpayService } from './razorpay.service';
import { Public } from '../common/decorators';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly billingService: BillingService,
    private readonly razorpayService: RazorpayService,
  ) {}

  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleStripeWebhook(@Req() req: Request) {
    const event = req.body;
    if (!event?.type) {
      return { received: false, error: 'Invalid event' };
    }
    await this.billingService.handleWebhook(event);
    return { received: true };
  }

  @Public()
  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleRazorpayWebhook(@Req() req: Request) {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);

    // Verify signature
    if (signature && !this.razorpayService.verifyWebhookSignature(body, signature)) {
      return { received: false, error: 'Invalid signature' };
    }

    const event = req.body;
    if (!event?.event) {
      return { received: false, error: 'Invalid event' };
    }

    await this.razorpayService.handleWebhook(event);
    return { received: true };
  }
}
