import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; errorMessage: string };

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    const from = this.configService.get<string>('RESEND_FROM_EMAIL')?.trim();

    this.fromEmail = from && from.length > 0 ? from : null;
    this.resend = apiKey && apiKey.length > 0 ? new Resend(apiKey) : null;

    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY is not configured; outbound email is disabled.',
      );
    } else if (!this.fromEmail) {
      this.logger.warn(
        'RESEND_FROM_EMAIL is not configured; outbound email is disabled.',
      );
    }
  }

  isConfigured(): boolean {
    return this.resend !== null && this.fromEmail !== null;
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.resend || !this.fromEmail) {
      return {
        ok: false,
        errorMessage: 'Email delivery is not configured on the server.',
      };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      if (response.error) {
        this.logger.warn(
          `Resend rejected email to ${this.maskEmail(params.to)}: ${response.error.message}`,
        );
        return { ok: false, errorMessage: response.error.message };
      }

      const messageId = response.data?.id ?? 'unknown';
      this.logger.log(
        `Email sent to ${this.maskEmail(params.to)} (id=${messageId})`,
      );
      return { ok: true, messageId };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown email send error';
      this.logger.error(
        `Failed to send email to ${this.maskEmail(params.to)}: ${message}`,
      );
      return { ok: false, errorMessage: message };
    }
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) {
      return '***';
    }
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }
}
