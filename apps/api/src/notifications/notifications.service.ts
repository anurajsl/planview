import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationEntity } from '../database/entities';

export interface NotificationPayload {
  tenantId: string;
  event: 'story.created' | 'story.completed' | 'story.overdue' | 'story.assigned' | 'member.joined' | 'project.created';
  title: string;
  body: string;
  url?: string;
  color?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(
    @InjectRepository(IntegrationEntity)
    private readonly integrationRepo: Repository<IntegrationEntity>,
  ) {}

  /**
   * Send a notification to all configured chat channels for a tenant.
   * Non-blocking — failures are logged but don't throw.
   */
  async notify(payload: NotificationPayload): Promise<void> {
    const integrations = await this.integrationRepo.find({
      where: { tenantId: payload.tenantId, isActive: true },
    });

    const chatIntegrations = integrations.filter((i) =>
      ['slack', 'teams', 'google_chat'].includes(i.provider),
    );

    if (chatIntegrations.length === 0) return;

    const promises = chatIntegrations.map((integration) =>
      this.sendToProvider(integration, payload).catch((err) => {
        this.logger.warn(`Failed to send ${payload.event} to ${integration.provider}: ${err.message}`);
      }),
    );

    await Promise.allSettled(promises);
  }

  private async sendToProvider(integration: IntegrationEntity, payload: NotificationPayload) {
    switch (integration.provider) {
      case 'slack':
        return this.sendSlack(integration.baseUrl, payload);
      case 'teams':
        return this.sendTeams(integration.baseUrl, payload);
      case 'google_chat':
        return this.sendGoogleChat(integration.baseUrl, payload);
    }
  }

  // ─── Slack (Incoming Webhook) ─────────────────────────────

  private async sendSlack(webhookUrl: string, payload: NotificationPayload) {
    const color = payload.color || '#3b82f6';
    const body = {
      attachments: [{
        color,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*${payload.title}*\n${payload.body}` },
          },
          ...(payload.url ? [{
            type: 'actions',
            elements: [{
              type: 'button',
              text: { type: 'plain_text', text: 'View in PlanView' },
              url: payload.url,
              style: 'primary',
            }],
          }] : []),
        ],
      }],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Slack ${res.status}: ${await res.text()}`);
  }

  // ─── Microsoft Teams (Incoming Webhook) ───────────────────

  private async sendTeams(webhookUrl: string, payload: NotificationPayload) {
    const color = (payload.color || '#3b82f6').replace('#', '');
    const body = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: color,
      summary: payload.title,
      sections: [{
        activityTitle: payload.title,
        activitySubtitle: 'PlanView',
        text: payload.body,
        markdown: true,
      }],
      potentialAction: payload.url ? [{
        '@type': 'OpenUri',
        name: 'View in PlanView',
        targets: [{ os: 'default', uri: payload.url }],
      }] : [],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Teams ${res.status}: ${await res.text()}`);
  }

  // ─── Google Chat (Incoming Webhook) ───────────────────────

  private async sendGoogleChat(webhookUrl: string, payload: NotificationPayload) {
    const body = {
      cardsV2: [{
        cardId: `planview-${Date.now()}`,
        card: {
          header: {
            title: payload.title,
            subtitle: 'PlanView',
            imageUrl: 'https://planview.app/icon.png',
            imageType: 'CIRCLE',
          },
          sections: [{
            widgets: [
              { textParagraph: { text: payload.body } },
              ...(payload.url ? [{
                buttonList: {
                  buttons: [{
                    text: 'View in PlanView',
                    onClick: { openLink: { url: payload.url } },
                  }],
                },
              }] : []),
            ],
          }],
        },
      }],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Google Chat ${res.status}: ${await res.text()}`);
  }

  // ─── Test webhook ─────────────────────────────────────────

  async testWebhook(provider: string, webhookUrl: string): Promise<boolean> {
    const testPayload: NotificationPayload = {
      tenantId: 'test',
      event: 'story.created',
      title: '✅ PlanView Connected',
      body: 'This is a test notification from PlanView. Your webhook is working!',
      color: '#22c55e',
    };

    try {
      switch (provider) {
        case 'slack': await this.sendSlack(webhookUrl, testPayload); break;
        case 'teams': await this.sendTeams(webhookUrl, testPayload); break;
        case 'google_chat': await this.sendGoogleChat(webhookUrl, testPayload); break;
        default: return false;
      }
      return true;
    } catch (err: any) {
      this.logger.warn(`Webhook test failed for ${provider}: ${err.message}`);
      return false;
    }
  }
}
