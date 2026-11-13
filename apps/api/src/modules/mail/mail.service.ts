import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) return null;
    const port = this.config.get<number>('SMTP_PORT') ?? 587;
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      pool: true,
      maxConnections: 5,
    });
    return this.transporter;
  }

  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.log('[MailService] Email skipped (SMTP not configured)');
      return;
    }

    const user = this.config.get<string>('SMTP_USER');
    const from = this.config.get<string>('SMTP_FROM') ?? user ?? 'noreply@localhost';

    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text: text ?? html.replace(/<[^>]+>/g, ''),
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error instanceof Error ? error.stack : String(error));
    }
  }
}
