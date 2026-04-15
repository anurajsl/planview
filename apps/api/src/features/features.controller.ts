import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FeaturesService } from './features.service';
import { TenantId } from '../common/decorators';

@ApiTags('Features')
@ApiBearerAuth()
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  @ApiOperation({ summary: 'List features for a project' })
  async findAll(
    @TenantId() tenantId: string,
    @Query('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.featuresService.findAll(tenantId, projectId);
  }

  @Post()
  async create(
    @TenantId() tenantId: string,
    @Body() dto: { projectId: string; name: string; color?: string },
  ) {
    return this.featuresService.create(tenantId, dto);
  }

  @Patch(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { name?: string; color?: string; sortOrder?: number },
  ) {
    return this.featuresService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.featuresService.delete(tenantId, id);
  }
}
