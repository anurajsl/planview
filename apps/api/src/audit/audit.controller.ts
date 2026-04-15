import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../database/entities';
import { TenantId, Roles } from '../common/decorators';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  @Get()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'List audit logs (Owner/Admin only)' })
  async findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(parseInt(limit || '50', 10), 100);
    const skip = (Math.max(parseInt(page || '1', 10), 1) - 1) * take;

    const [items, total] = await this.auditRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take,
      skip,
      relations: [],
    });

    return { items, total, page: Math.floor(skip / take) + 1, pageSize: take };
  }
}
