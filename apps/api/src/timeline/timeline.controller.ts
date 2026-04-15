import { Controller, Get, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import { TenantId } from '../common/decorators';

@ApiTags('Timeline')
@ApiBearerAuth()
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get()
  @ApiOperation({ summary: 'Get full Gantt timeline data for a project' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'from', required: false, description: 'Start date filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date filter (YYYY-MM-DD)' })
  async getTimeline(
    @TenantId() tenantId: string,
    @Query('projectId', ParseUUIDPipe) projectId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('statuses') statuses?: string,
    @Query('assigneeIds') assigneeIds?: string,
    @Query('featureIds') featureIds?: string,
  ) {
    return this.timelineService.getTimeline(tenantId, {
      projectId,
      from,
      to,
      statuses: statuses?.split(','),
      assigneeIds: assigneeIds?.split(','),
      featureIds: featureIds?.split(','),
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get smart summary for project health' })
  async getSummary(
    @TenantId() tenantId: string,
    @Query('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.timelineService.getSummary(tenantId, projectId);
  }
}
