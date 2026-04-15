import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../database/entities';
import * as crypto from 'crypto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity) private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  async log(params: {
    tenantId: string;
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    changes?: Record<string, any>;
    ipAddress?: string;
  }) {
    const entry = this.auditRepo.create({
      tenantId: params.tenantId,
      actorId: params.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      changes: params.changes || {},
      ipHash: params.ipAddress
        ? crypto.createHash('sha256').update(params.ipAddress).digest('hex').slice(0, 16)
        : null,
    });
    return this.auditRepo.save(entry);
  }

  async findByResource(tenantId: string, resourceType: string, resourceId: string) {
    return this.auditRepo.find({
      where: { tenantId, resourceType, resourceId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
