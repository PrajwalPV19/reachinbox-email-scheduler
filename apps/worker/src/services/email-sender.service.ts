import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface SendEmailOptions {
  fromName?: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl?: string;
}

export class EmailSenderService {
  private transporter: Transporter | null = null;
  private isTestAccount: boolean = false;

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    if (config.ethereal.user && config.ethereal.pass) {
      this.transporter = nodemailer.createTransport({
        host: config.ethereal.host,
        port: config.ethereal.port,
        secure: config.ethereal.port === 465,
        auth: {
          user: config.ethereal.user,
          pass: config.ethereal.pass,
        },
      });
      logger.info('Initialized Nodemailer with configured Ethereal SMTP credentials');
    } else {
      // Auto-generate test account on Ethereal
      logger.info('No Ethereal credentials provided; generating ephemeral test account...');
      const testAccount = await nodemailer.createTestAccount();
      this.isTestAccount = true;
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      logger.info(
        { user: testAccount.user },
        'Created ephemeral Ethereal test account for development'
      );
    }

    return this.transporter;
  }

  public async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const transporter = await this.getTransporter();

    const fromAddress = options.fromName
      ? `"${options.fromName}" <${options.fromEmail}>`
      : options.fromEmail;

    const mailOptions = {
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.body,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="margin-bottom: 20px; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 18px;">ReachInbox Outreach</h2>
          </div>
          <div style="white-space: pre-wrap; font-size: 15px;">${options.body}</div>
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #6b7280;">
            Sent securely via ReachInbox Production Email Job Scheduler
          </div>
        </div>
      `,
    };

    const start = Date.now();
    const info = await transporter.sendMail(mailOptions);
    const duration = Date.now() - start;

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

    logger.info(
      {
        messageId: info.messageId,
        recipient: options.to,
        duration,
        previewUrl,
      },
      '📧 Email successfully sent via SMTP'
    );

    return {
      messageId: info.messageId,
      previewUrl: previewUrl ? previewUrl.toString() : undefined,
    };
  }
}

export const emailSenderService = new EmailSenderService();
