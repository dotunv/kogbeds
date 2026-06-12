import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendMail(input: SendMailInput): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn(
        `SMTP not configured; would send to ${input.to}: ${input.subject}`,
      );
      return;
    }

    const port = this.config.get<number>('SMTP_PORT') ?? 587;
    const secure = this.config.get<boolean>('SMTP_SECURE') ?? port === 465;
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from =
      this.config.get<string>('SMTP_FROM') ?? user ?? 'noreply@localhost';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth:
        user && pass
          ? {
              user,
              pass,
            }
          : undefined,
    });

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, '<br/>'),
    });
  }
}
