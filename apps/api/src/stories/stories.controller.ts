import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoriesService } from './stories.service';
import { CreateStoryDto, UpdateStoryDto, MoveStoryDto } from './dto/story.dto';
import { CurrentUser, TenantId } from '../common/decorators';
import { PlanGuard, PlanLimit } from '../billing/plan.guard';

@ApiTags('Stories')
@ApiBearerAuth()
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List stories for a project' })
  async findAll(
    @TenantId() tenantId: string,
    @Query('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.storiesService.findAll(tenantId, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get story details' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.storiesService.findOne(tenantId, id);
  }

  @Post()
  @UseGuards(PlanGuard)
  @PlanLimit('story')
  @ApiOperation({ summary: 'Create a new story (enforces plan limit)' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateStoryDto,
  ) {
    return this.storiesService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update story fields' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoryDto,
  ) {
    return this.storiesService.update(tenantId, id, dto);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move story on timeline (drag)' })
  async move(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveStoryDto,
  ) {
    return this.storiesService.move(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a story' })
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.storiesService.delete(tenantId, id);
  }
}
