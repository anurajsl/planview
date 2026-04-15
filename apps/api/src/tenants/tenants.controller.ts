import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '../database/entities';
import { UpdateTenantDto } from './dto/tenant.dto';
import { TenantId, Roles } from '../common/decorators';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity>,
  ) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant details' })
  async getCurrent(@TenantId() tenantId: string) {
    return this.tenantRepo.findOne({ where: { id: tenantId } });
  }

  @Patch('current')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update tenant settings (Owner/Admin only)' })
  async updateCurrent(
    @TenantId() tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    const update: Partial<TenantEntity> = {};
    if (dto.name) update.name = dto.name;
    if (dto.slug) update.slug = dto.slug;

    if (Object.keys(update).length > 0) {
      await this.tenantRepo.update({ id: tenantId }, update);
    }

    return this.tenantRepo.findOne({ where: { id: tenantId } });
  }
}
