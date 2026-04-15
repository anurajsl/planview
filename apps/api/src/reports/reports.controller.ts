import { Controller, Get, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { TenantId } from '../common/decorators';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('project/:projectId/velocity')
  @ApiOperation({ summary: 'Get velocity data (stories completed per week)' })
  async velocity(
    @TenantId() tenantId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('weeks') weeks?: string,
  ) {
    return this.reportsService.getVelocity(tenantId, projectId, parseInt(weeks || '12', 10));
  }

  @Get('project/:projectId/burndown')
  @ApiOperation({ summary: 'Get burndown chart data' })
  async burndown(
    @TenantId() tenantId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.reportsService.getBurndown(tenantId, projectId);
  }

  @Get('project/:projectId/status-breakdown')
  @ApiOperation({ summary: 'Get story status breakdown' })
  async statusBreakdown(
    @TenantId() tenantId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.reportsService.getStatusBreakdown(tenantId, projectId);
  }

  @Get('project/:projectId/member-workload')
  @ApiOperation({ summary: 'Get workload per team member' })
  async memberWorkload(
    @TenantId() tenantId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.reportsService.getMemberWorkload(tenantId, projectId);
  }
}
