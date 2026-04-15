import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/**
 * @CurrentUser() decorator
 * Extracts the authenticated user from the request object.
 * Usage: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

/**
 * @TenantId() decorator
 * Extracts the tenant ID from the authenticated user's JWT.
 * Usage: @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);

/**
 * @Public() decorator
 * Marks a route as publicly accessible (no auth required).
 * Usage: @Public()
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * @Roles() decorator
 * Restricts access to specific user roles.
 * Usage: @Roles(UserRole.ADMIN, UserRole.OWNER)
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
