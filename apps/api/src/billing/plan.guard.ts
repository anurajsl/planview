import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingService } from './billing.service';

/**
 * @PlanLimit('project') decorator
 * Apply to endpoints that create resources to enforce plan limits.
 */
export const PLAN_LIMIT_KEY = 'planLimit';
export const PlanLimit = (resource: 'project' | 'user' | 'story') =>
  (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(PLAN_LIMIT_KEY, resource, descriptor.value);
    return descriptor;
  };

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<string>(PLAN_LIMIT_KEY, context.getHandler());
    if (!resource) return true; // No limit check needed

    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;
    if (!tenantId) return true;

    const projectId = request.body?.projectId || request.params?.projectId;

    await this.billingService.enforceLimit(
      tenantId,
      resource as 'project' | 'user' | 'story',
      projectId,
    );

    return true;
  }
}
