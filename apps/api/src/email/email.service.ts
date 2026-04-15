import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email');
  private readonly provider: string;
  private readonly from: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get('EMAIL_PROVIDER', 'log'); // 'sendgrid' | 'ses' | 'smtp' | 'log'
    this.from = this.config.get('EMAIL_FROM', 'PlanView <noreply@planview.app>');
    this.apiKey = this.config.get('SENDGRID_API_KEY', '');
    this.baseUrl = this.config.get('APP_URL', 'http://localhost:5173');
  }

  async send(options: EmailOptions): Promise<boolean> {
    if (this.provider === 'log' || !this.apiKey) {
      this.logger.log(`[DEV EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      this.logger.debug(`[DEV EMAIL] Body: ${options.text || options.html.slice(0, 200)}`);
      return true;
    }

    if (this.provider === 'sendgrid') {
      return this.sendViaSendGrid(options);
    }

    this.logger.warn(`Unknown email provider: ${this.provider}`);
    return false;
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<boolean> {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: options.to }] }],
          from: { email: this.from.match(/<(.+)>/)?.[1] || this.from, name: 'PlanView' },
          subject: options.subject,
          content: [
            ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
            { type: 'text/html', value: options.html },
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`SendGrid error: ${err}`);
        return false;
      }
      return true;
    } catch (err: any) {
      this.logger.error(`SendGrid send failed: ${err.message}`);
      return false;
    }
  }

  // ─── Email Templates ──────────────────────────────────────

  async sendInvitation(params: { to: string; inviterName: string; tenantName: string; token: string; role: string }) {
    const acceptUrl = `${this.baseUrl}/invitations/accept?token=${params.token}`;
    return this.send({
      to: params.to,
      subject: `You're invited to join ${params.tenantName} on PlanView`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 0;">
          <div style="background: linear-gradient(135deg, #1e3a5f, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 22px;">PlanView</h1>
          </div>
          <div style="background: #fff; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 15px; color: #374151; margin: 0 0 16px;">
              <strong>${params.inviterName}</strong> has invited you to join <strong>${params.tenantName}</strong> as a <strong>${params.role}</strong>.
            </p>
            <a href="${acceptUrl}" style="display: inline-block; background: #1e3a5f; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Accept Invitation
            </a>
            <p style="font-size: 12px; color: #9ca3af; margin: 20px 0 0;">
              This invitation expires in 7 days. If you didn't expect this, you can ignore it.
            </p>
          </div>
        </div>
      `,
      text: `${params.inviterName} invited you to join ${params.tenantName} on PlanView. Accept: ${acceptUrl}`,
    });
  }

  async sendOverdueAlert(params: { to: string; userName: string; stories: { name: string; daysOverdue: number }[]; projectName: string }) {
    const storyList = params.stories
      .map((s) => `<li style="margin: 4px 0;"><strong>${s.name}</strong> — ${s.daysOverdue} day${s.daysOverdue > 1 ? 's' : ''} overdue</li>`)
      .join('');

    return this.send({
      to: params.to,
      subject: `⚠️ ${params.stories.length} overdue stories in ${params.projectName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 0;">
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px 24px; border-radius: 12px;">
            <h2 style="color: #991b1b; margin: 0 0 12px; font-size: 16px;">⚠️ Overdue Stories</h2>
            <p style="font-size: 14px; color: #374151; margin: 0 0 12px;">
              Hi ${params.userName}, you have overdue stories in <strong>${params.projectName}</strong>:
            </p>
            <ul style="font-size: 13px; color: #4b5563; padding-left: 20px; margin: 0 0 16px;">${storyList}</ul>
            <a href="${this.baseUrl}" style="display: inline-block; background: #ef4444; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px;">
              View in PlanView
            </a>
          </div>
        </div>
      `,
      text: `Hi ${params.userName}, you have ${params.stories.length} overdue stories in ${params.projectName}.`,
    });
  }

  async sendWelcome(params: { to: string; userName: string; tenantName: string }) {
    return this.send({
      to: params.to,
      subject: `Welcome to PlanView, ${params.userName}!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 0;">
          <div style="background: linear-gradient(135deg, #1e3a5f, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 22px;">Welcome to PlanView 🎉</h1>
          </div>
          <div style="background: #fff; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 15px; color: #374151; margin: 0 0 16px;">
              Hi <strong>${params.userName}</strong>, your organization <strong>${params.tenantName}</strong> is ready to go.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px;">
              Start by creating your first project and adding team members. Your Gantt timeline will come to life as you add stories.
            </p>
            <a href="${this.baseUrl}" style="display: inline-block; background: #1e3a5f; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Open PlanView
            </a>
          </div>
        </div>
      `,
      text: `Welcome to PlanView, ${params.userName}! Your org ${params.tenantName} is ready. Open: ${this.baseUrl}`,
    });
  }
}
