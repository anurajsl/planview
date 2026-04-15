import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto, UpdateIntegrationDto, LinkStoryDto } from './dto/integration.dto';
import { TenantId, CurrentUser, Roles } from '../common/decorators';
import { NotificationsService } from '../notifications/notifications.service';

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all integrations for tenant' })
  async list(@TenantId() tenantId: string) {
    return this.integrationsService.list(tenantId);
  }

  @Post()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a new integration (Jira or GitLab)' })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateIntegrationDto,
  ) {
    return this.integrationsService.create(tenantId, userId, dto);
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update an integration' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    return this.integrationsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an integration' })
  async remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.integrationsService.remove(tenantId, id);
  }

  @Post(':id/test')
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test integration connection' })
  async test(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.integrationsService.testExisting(tenantId, id);
  }

  @Post('test-webhook')
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test a chat webhook (Slack/Teams/Google Chat)' })
  async testWebhook(
    @Body() dto: { provider: string; webhookUrl: string },
  ) {
    const ok = await this.notificationsService.testWebhook(dto.provider, dto.webhookUrl);
    return { success: ok };
  }

  @Get('jira/search')
  @ApiOperation({ summary: 'Search Jira issues' })
  async searchJira(@TenantId() tenantId: string, @Query('q') query: string) {
    return this.integrationsService.searchJiraIssues(tenantId, query || '');
  }

  @Get('gitlab/issues')
  @ApiOperation({ summary: 'Search GitLab issues' })
  async searchGitLabIssues(@TenantId() tenantId: string, @Query('q') query: string) {
    return this.integrationsService.searchGitLabIssues(tenantId, query || '');
  }

  @Get('gitlab/merge-requests')
  @ApiOperation({ summary: 'Search GitLab merge requests' })
  async searchGitLabMRs(@TenantId() tenantId: string, @Query('q') query: string) {
    return this.integrationsService.searchGitLabMRs(tenantId, query || '');
  }

  @Get('links/:storyId')
  @ApiOperation({ summary: 'Get all links for a story' })
  async getLinks(@TenantId() tenantId: string, @Param('storyId', ParseUUIDPipe) storyId: string) {
    return this.integrationsService.getStoryLinks(tenantId, storyId);
  }

  @Post('links')
  @ApiOperation({ summary: 'Link a story to an external issue/MR' })
  async linkStory(@TenantId() tenantId: string, @Body() dto: LinkStoryDto) {
    return this.integrationsService.linkStory(tenantId, dto);
  }

  @Delete('links/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a story link' })
  async unlinkStory(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.integrationsService.unlinkStory(tenantId, id);
  }
}
