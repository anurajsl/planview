import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  ParseUUIDPipe, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { TenantId, CurrentUser } from '../common/decorators';
import { PlanGuard, PlanLimit } from '../billing/plan.guard';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  async findAll(@TenantId() tenantId: string) {
    return this.projectsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.findOne(tenantId, id);
  }

  @Post()
  @UseGuards(PlanGuard)
  @PlanLimit('project')
  @ApiOperation({ summary: 'Create a new project (enforces plan limit)' })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: { name: string; description?: string },
  ) {
    return this.projectsService.create(tenantId, userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { name?: string; description?: string; status?: string },
  ) {
    return this.projectsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete project' })
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.delete(tenantId, id);
  }
}
