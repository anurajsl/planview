import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { RazorpayService } from './razorpay.service';
import { BillingController } from './billing.controller';
import { WebhookController } from './webhook.controller';
import { PlanGuard } from './plan.guard';
import {
  SubscriptionEntity, TenantEntity, ProjectEntity, UserEntity, StoryEntity,
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionEntity, TenantEntity, ProjectEntity, UserEntity, StoryEntity,
    ]),
  ],
  providers: [BillingService, RazorpayService, PlanGuard],
  controllers: [BillingController, WebhookController],
  exports: [BillingService, RazorpayService, PlanGuard],
})
export class BillingModule {}
