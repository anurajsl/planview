import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubtasksService } from './subtasks.service';
import { TenantId } from '../common/decorators';

@ApiTags('Subtasks')
@ApiBearerAuth()
@Controller('subtasks')
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Get()
  @ApiOperation({ summary: 'List subtasks for a story' })
  async findByStory(
    @TenantId() tenantId: string,
    @Query('storyId', ParseUUIDPipe) storyId: string,
  ) {
    return this.subtasksService.findByStory(tenantId, storyId);
  }

  @Post()
  async create(
    @TenantId() tenantId: string,
    @Body() dto: { storyId: string; name: string; startDate?: string; endDate?: string; assigneeId?: string },
  ) {
    return this.subtasksService.create(tenantId, dto);
  }

  @Patch(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { name?: string; status?: string; startDate?: string; endDate?: string; assigneeId?: string; sortOrder?: number },
  ) {
    return this.subtasksService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subtasksService.delete(tenantId, id);
  }
}
