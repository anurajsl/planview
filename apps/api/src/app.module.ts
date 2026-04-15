import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { ProjectsModule } from './projects/projects.module';
import { FeaturesModule } from './features/features.module';
import { StoriesModule } from './stories/stories.module';
import { SubtasksModule } from './subtasks/subtasks.module';
import { DependenciesModule } from './dependencies/dependencies.module';
import { TimelineModule } from './timeline/timeline.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { WebSocketModule } from './websocket/websocket.module';
import { InvitationsModule } from './invitations/invitations.module';
import { BillingModule } from './billing/billing.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { HealthModule } from './health/health.module';
import { ExportsModule } from './exports/exports.module';
import { EmailModule } from './email/email.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { validate } from './common/config/env.validation';
import {
  TenantEntity, UserEntity, ProjectEntity, ProjectMemberEntity,
  FeatureEntity, StoryEntity, SubtaskEntity, DependencyEntity,
  AuditLogEntity, SavedViewEntity, RefreshTokenEntity, InvitationEntity, SubscriptionEntity,
  IntegrationEntity, StoryLinkEntity,
} from './database/entities';

@Module({
  imports: [
    // ─── Configuration ───
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate,
    }),

    // ─── Database ───
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [
          TenantEntity, UserEntity, ProjectEntity, ProjectMemberEntity,
          FeatureEntity, StoryEntity, SubtaskEntity, DependencyEntity,
          AuditLogEntity, SavedViewEntity, RefreshTokenEntity, InvitationEntity, SubscriptionEntity,
          IntegrationEntity, StoryLinkEntity,
        ],
        synchronize: false, // NEVER true in production — use migrations
        logging: config.get('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
        extra: {
          // Connection pool settings for multi-tenant scalability
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),

    // ─── Rate Limiting ───
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second
        limit: 20,   // 20 requests per second
      },
      {
        name: 'medium',
        ttl: 60000,  // 1 minute
        limit: 200,  // 200 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 5000,  // 5000 requests per hour
      },
    ]),

    // ─── Feature Modules ───
    AuthModule,
    TenantsModule,
    UsersModule,
    ProjectsModule,
    FeaturesModule,
    StoriesModule,
    SubtasksModule,
    DependenciesModule,
    TimelineModule,
    AuditModule,
    WebSocketModule,
    InvitationsModule,
    BillingModule,
    IntegrationsModule,
    HealthModule,
    ExportsModule,
    EmailModule,
    ReportsModule,
    NotificationsModule,
  ],
  providers: [
    // ─── Global Guards (applied to ALL routes) ───
    // Order matters: Auth → Roles → Throttle
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Every route requires JWT unless @Public()
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Checks @Roles() decorator if present
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Rate limiting on all routes
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Apply TenantMiddleware to all authenticated routes.
   * This sets the PostgreSQL RLS session variable so every query
   * is automatically scoped to the current tenant.
   *
   * Excluded: /auth/* routes (no tenant context before login)
   */
  configure(consumer: MiddlewareConsumer) {
    // Request logging on all routes
    consumer.apply(RequestLoggerMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });

    // Tenant isolation middleware
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'invitations/accept', method: RequestMethod.POST },
        { path: 'webhooks/stripe', method: RequestMethod.POST },
        { path: 'webhooks/razorpay', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
        { path: 'health/ready', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
