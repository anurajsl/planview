import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IntegrationEntity, StoryLinkEntity } from '../database/entities';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger('Integrations');
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(IntegrationEntity) private readonly integrationRepo: Repository<IntegrationEntity>,
    @InjectRepository(StoryLinkEntity) private readonly linkRepo: Repository<StoryLinkEntity>,
    private readonly config: ConfigService,
  ) {
    this.encryptionKey = this.config.get('JWT_SECRET', 'dev-key').slice(0, 32).padEnd(32, '0');
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // ─── CRUD ─────────────────────────────────────────────────

  async list(tenantId: string) {
    const integrations = await this.integrationRepo.find({ where: { tenantId } });
    return integrations.map((i) => ({ ...i, apiTokenEncrypted: '••••••••' }));
  }

  async create(tenantId: string, userId: string, dto: {
    provider: string; baseUrl: string; apiToken?: string;
    username?: string; projectKey?: string;
  }) {
    if (!['jira', 'gitlab', 'slack', 'teams', 'google_chat'].includes(dto.provider)) {
      throw new BadRequestException('Invalid provider');
    }

    const isChatProvider = ['slack', 'teams', 'google_chat'].includes(dto.provider);

    // Test connection before saving (skip for chat — tested separately)
    if (!isChatProvider && dto.apiToken) {
      await this.testConnection(dto.provider, dto.baseUrl, dto.apiToken, dto.username);
    }

    const integration = this.integrationRepo.create({
      tenantId,
      provider: dto.provider,
      baseUrl: dto.baseUrl.replace(/\/+$/, ''),
      apiTokenEncrypted: dto.apiToken ? this.encrypt(dto.apiToken) : '',
      username: dto.username || null,
      projectKey: dto.projectKey || null,
      createdBy: userId,
    });
    return this.integrationRepo.save(integration);
  }

  async update(tenantId: string, id: string, dto: {
    baseUrl?: string; apiToken?: string; username?: string;
    projectKey?: string; isActive?: boolean;
  }) {
    const integration = await this.integrationRepo.findOne({ where: { id, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');

    if (dto.baseUrl) integration.baseUrl = dto.baseUrl.replace(/\/+$/, '');
    if (dto.apiToken) integration.apiTokenEncrypted = this.encrypt(dto.apiToken);
    if (dto.username !== undefined) integration.username = dto.username || null;
    if (dto.projectKey !== undefined) integration.projectKey = dto.projectKey || null;
    if (dto.isActive !== undefined) integration.isActive = dto.isActive;

    return this.integrationRepo.save(integration);
  }

  async remove(tenantId: string, id: string) {
    const integration = await this.integrationRepo.findOne({ where: { id, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');
    await this.integrationRepo.delete({ id, tenantId });
    return { deleted: true };
  }

  // ─── Connection Test ──────────────────────────────────────

  private async testConnection(provider: string, baseUrl: string, token: string, username?: string) {
    try {
      if (provider === 'jira') {
        const auth = Buffer.from(`${username}:${token}`).toString('base64');
        const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
          headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
        });
        if (!res.ok) throw new Error(`Jira returned ${res.status}`);
      } else if (provider === 'gitlab') {
        const res = await fetch(`${baseUrl}/api/v4/user`, {
          headers: { 'PRIVATE-TOKEN': token },
        });
        if (!res.ok) throw new Error(`GitLab returned ${res.status}`);
      }
    } catch (err: any) {
      this.logger.warn(`Connection test failed for ${provider}: ${err.message}`);
      throw new BadRequestException(`Failed to connect to ${provider}: ${err.message}`);
    }
  }

  async testExisting(tenantId: string, id: string) {
    const integration = await this.integrationRepo.findOne({ where: { id, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');
    const token = this.decrypt(integration.apiTokenEncrypted);
    await this.testConnection(integration.provider, integration.baseUrl, token, integration.username || undefined);
    return { connected: true };
  }

  // ─── External API Calls ───────────────────────────────────

  private async getIntegration(tenantId: string, provider: string) {
    const integration = await this.integrationRepo.findOne({
      where: { tenantId, provider, isActive: true },
    });
    if (!integration) throw new NotFoundException(`No active ${provider} integration`);
    return { ...integration, apiToken: this.decrypt(integration.apiTokenEncrypted) };
  }

  async searchJiraIssues(tenantId: string, query: string) {
    const int = await this.getIntegration(tenantId, 'jira');
    const auth = Buffer.from(`${int.username}:${int.apiToken}`).toString('base64');
    const jql = int.projectKey
      ? `project = ${int.projectKey} AND text ~ "${query}" ORDER BY updated DESC`
      : `text ~ "${query}" ORDER BY updated DESC`;

    const res = await fetch(
      `${int.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=20&fields=summary,status,assignee,issuetype`,
      { headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' } },
    );
    const data = await res.json();
    return (data.issues || []).map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      title: issue.fields?.summary,
      status: issue.fields?.status?.name,
      type: issue.fields?.issuetype?.name,
      url: `${int.baseUrl}/browse/${issue.key}`,
    }));
  }

  async searchGitLabIssues(tenantId: string, query: string) {
    const int = await this.getIntegration(tenantId, 'gitlab');
    const projectId = int.projectKey;
    const basePath = projectId
      ? `/api/v4/projects/${encodeURIComponent(projectId)}/issues`
      : `/api/v4/issues`;

    const res = await fetch(
      `${int.baseUrl}${basePath}?search=${encodeURIComponent(query)}&per_page=20&state=opened`,
      { headers: { 'PRIVATE-TOKEN': int.apiToken } },
    );
    const issues = await res.json();
    return (Array.isArray(issues) ? issues : []).map((issue: any) => ({
      id: String(issue.id),
      key: `#${issue.iid}`,
      title: issue.title,
      status: issue.state,
      type: 'issue',
      url: issue.web_url,
    }));
  }

  async searchGitLabMRs(tenantId: string, query: string) {
    const int = await this.getIntegration(tenantId, 'gitlab');
    const projectId = int.projectKey;
    const basePath = projectId
      ? `/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests`
      : `/api/v4/merge_requests`;

    const res = await fetch(
      `${int.baseUrl}${basePath}?search=${encodeURIComponent(query)}&per_page=20&state=opened`,
      { headers: { 'PRIVATE-TOKEN': int.apiToken } },
    );
    const mrs = await res.json();
    return (Array.isArray(mrs) ? mrs : []).map((mr: any) => ({
      id: String(mr.id),
      key: `!${mr.iid}`,
      title: mr.title,
      status: mr.state,
      type: 'merge_request',
      url: mr.web_url,
    }));
  }

  // ─── Story Links ──────────────────────────────────────────

  async getStoryLinks(tenantId: string, storyId: string) {
    return this.linkRepo.find({ where: { tenantId, storyId }, order: { createdAt: 'DESC' } });
  }

  async linkStory(tenantId: string, dto: {
    storyId: string; provider: string; linkType: string;
    externalId: string; externalKey?: string; externalUrl?: string; title?: string;
  }) {
    const integration = await this.integrationRepo.findOne({
      where: { tenantId, provider: dto.provider, isActive: true },
    });
    if (!integration) throw new NotFoundException(`No active ${dto.provider} integration`);

    const link = this.linkRepo.create({
      tenantId,
      storyId: dto.storyId,
      integrationId: integration.id,
      provider: dto.provider,
      linkType: dto.linkType || 'issue',
      externalId: dto.externalId,
      externalKey: dto.externalKey || null,
      externalUrl: dto.externalUrl || null,
      title: dto.title || null,
      syncedAt: new Date(),
    });
    return this.linkRepo.save(link);
  }

  async unlinkStory(tenantId: string, linkId: string) {
    const link = await this.linkRepo.findOne({ where: { id: linkId, tenantId } });
    if (!link) throw new NotFoundException('Link not found');
    await this.linkRepo.delete({ id: linkId });
    return { deleted: true };
  }
}
