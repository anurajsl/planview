import {
  Controller, Get, Post, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DependenciesService } from './dependencies.service';
import { TenantId } from '../common/decorators';

@ApiTags('Dependencies')
@ApiBearerAuth()
@Controller('dependencies')
export class DependenciesController {
  constructor(private readonly depsService: DependenciesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a dependency between stories' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: { fromStoryId: string; toStoryId: string; type?: string },
  ) {
    return this.depsService.create(tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a dependency' })
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.depsService.delete(tenantId, id);
  }
}
