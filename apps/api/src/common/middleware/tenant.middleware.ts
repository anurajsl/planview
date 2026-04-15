import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource, EntityManager } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * TenantMiddleware
 *
 * This is the most critical security middleware in the application.
 * 
 * IMPORTANT: NestJS middleware runs BEFORE guards, so the JWT guard
 * hasn't populated req.user yet. We decode the JWT manually here to
 * extract tenantId, then attach it to the request for downstream use.
 * 
 * For RLS: rather than SET LOCAL per-request (which requires a dedicated
 * connection), we inject tenantId into every TypeORM query via a
 * request-scoped approach. The tenantId is carried on req and used by
 * services to scope all queries.
 *
 * The RLS policies in PostgreSQL act as defense-in-depth — if any
 * query somehow bypasses the application layer, RLS blocks it.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction) {
    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = this.jwtService.verify(token, {
          secret: this.config.get('JWT_SECRET'),
        });

        // Attach tenant context to request
        // This is used by @TenantId() decorator in controllers
        (req as any).tenantId = payload.tenantId;

        // Also pre-populate user if guard hasn't run yet
        if (!(req as any).user) {
          (req as any).user = {
            userId: payload.sub,
            tenantId: payload.tenantId,
            email: payload.email,
            role: payload.role,
          };
        }
      } catch {
        // Invalid token — let the JWT guard handle rejection
        // Don't block here, just don't set tenant context
      }
    }

    next();
  }
}
