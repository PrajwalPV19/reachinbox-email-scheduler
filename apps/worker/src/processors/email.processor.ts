import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { query } from '../db/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { RateLimiterService } from '../services/rate-limiter.service';
import { emailSenderService } from '../services/email-sender.service';
import { SlackNotifierService } from '../services/slack-notifier.service';
import { elasticsearchWorkerService } from '../services/elasticsearch.service';
import { EmailJobData, QUEUE_NAMES, Sender } from '@reachinbox/shared';

export class EmailProcessor {
  private rateLimiter: RateLimiterService;
  private queue: Queue<EmailJobData>;

  constructor(redisClient: Redis) {
    this.rateLimiter = new RateLimiterService(redisClient);
    this.queue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL_QUEUE, {
      connection: redisClient,
    });
  }

  public async process(job: Job<EmailJobData>): Promise<any> {
    const data = job.data;
    const { emailId, campaignId, userId, recipient, subject, body } = data;

    logger.info(
      { jobId: job.id, emailId, recipient, attempt: job.attemptsMade + 1 },
      '🚀 Processing email job'
    );

    // 1. Idempotency Check: Verify in DB whether this email was already sent
    const checkRes = await query<{ status: string; provider_message_id: string }>(
      'SELECT status, provider_message_id FROM emails WHERE id = $1 LIMIT 1',
      [emailId]
    );

    if (checkRes.rows.length === 0) {
      logger.warn({ emailId }, 'Email record not found in database; acknowledging job');
      return { skipped: true, reason: 'RECORD_NOT_FOUND' };
    }

    const currentEmail = checkRes.rows[0];
    if (currentEmail.status === 'sent') {
      logger.info(
        { emailId, providerMessageId: currentEmail.provider_message_id },
        'Email already sent in prior attempt. Skipping to prevent duplicate send.'
      );
      return { skipped: true, reason: 'ALREADY_SENT' };
    }

    // 2. Resolve Sender Details
    let senderId = data.senderId;
    let senderEmail = 'noreply@reachinbox.ai';
    let senderName = 'ReachInbox Outreach';
    let hourlyLimit = data.hourlyLimit || config.maxEmailsPerHour;

    if (senderId) {
      const senderRes = await query<Sender>(
        'SELECT * FROM senders WHERE id = $1 LIMIT 1',
        [senderId]
      );
      if (senderRes.rows.length > 0) {
        senderEmail = senderRes.rows[0].email;
        senderName = senderRes.rows[0].name || senderName;
        hourlyLimit = (senderRes.rows[0] as any).hourly_limit || senderRes.rows[0].hourlyLimit || hourlyLimit;
      }
    } else {
      senderId = 'default_sender';
    }

    // 3. Distributed Redis Rate Limiting (Hourly limit per sender)
    const rateLimitCheck = await this.rateLimiter.checkAndIncrementRateLimit(
      senderId,
      hourlyLimit
    );

    if (!rateLimitCheck.allowed) {
      const nextWindowTime = new Date(rateLimitCheck.nextWindowEpoch);
      const delayMs = Math.max(1000, rateLimitCheck.nextWindowEpoch - Date.now());

      logger.warn(
        {
          emailId,
          senderEmail,
          hourlyLimit,
          nextWindowTime: nextWindowTime.toISOString(),
          delayMs,
        },
        'Rate limit reached for sender. Rescheduling job to next hour window.'
      );

      // Update email status to rescheduled
      await query(
        `UPDATE emails
         SET status = 'rescheduled', scheduled_at = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [nextWindowTime, emailId]
      );

      // Re-enqueue job with delay into the next window
      await this.queue.add('send-email', data, {
        jobId: `rescheduled_${emailId}_${rateLimitCheck.nextWindowEpoch}`,
        delay: delayMs,
      });

      // Trigger Slack notification if not already alerted in this hour window
      const hourWindow = Math.floor(Date.now() / 3600000);
      const shouldAlert = await this.rateLimiter.shouldNotifySlack(senderId, hourWindow);
      if (shouldAlert) {
        await SlackNotifierService.notifyRateLimitHit(
          userId,
          senderEmail,
          hourlyLimit,
          rateLimitCheck.nextWindowEpoch
        );
      }

      return {
        rescheduled: true,
        reason: 'HOURLY_RATE_LIMIT_EXCEEDED',
        nextWindowTime: nextWindowTime.toISOString(),
      };
    }

    // 4. Minimum Delay Throttling between emails
    const minDelay = data.delayBetweenEmailsMs || config.minEmailDelayMs;
    await this.rateLimiter.enforceMinDelay(senderId, minDelay);

    // 5. Atomic state transition in PostgreSQL to 'processing'
    const transitionRes = await query(
      `UPDATE emails
       SET status = 'processing', attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status != 'sent'
       RETURNING *`,
      [emailId]
    );

    if (transitionRes.rowCount === 0) {
      logger.info({ emailId }, 'Email transition to processing failed; already sent concurrently');
      return { skipped: true, reason: 'CONCURRENTLY_SENT' };
    }

    // 6. Deliver email via Ethereal SMTP
    try {
      const sendResult = await emailSenderService.sendEmail({
        fromName: senderName,
        fromEmail: senderEmail,
        to: recipient,
        subject,
        body,
      });

      const sentAt = new Date();

      // 7. Update PostgreSQL on success
      await query(
        `UPDATE emails
         SET status = 'sent', sent_at = $1, provider_message_id = $2, ethereal_preview_url = $3, failure_reason = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [sentAt, sendResult.messageId, sendResult.previewUrl || null, emailId]
      );

      // Update Campaign progress
      await query(
        `UPDATE campaigns
         SET sent_count = sent_count + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [campaignId]
      );

      // Mark campaign completed if all emails are sent/failed
      await query(
        `UPDATE campaigns
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND (sent_count + failed_count) >= total_emails`,
        [campaignId]
      );

      // 8. Update Elasticsearch index
      elasticsearchWorkerService
        .updateEmailStatus(emailId, 'sent', sentAt, sendResult.previewUrl)
        .catch((err) => {
          logger.warn({ err, emailId }, 'Elasticsearch index update failed');
        });

      logger.info(
        { emailId, recipient, previewUrl: sendResult.previewUrl },
        '✅ Email successfully delivered and recorded'
      );

      return {
        success: true,
        messageId: sendResult.messageId,
        previewUrl: sendResult.previewUrl,
      };
    } catch (error: any) {
      logger.error(
        { error: error.message, emailId, recipient, attempt: job.attemptsMade + 1 },
        '❌ Failed to send email via SMTP'
      );

      if (job.attemptsMade + 1 >= 3) {
        // Mark permanently failed in DB after max attempts
        await query(
          `UPDATE emails
           SET status = 'failed', failure_reason = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [error.message || 'SMTP delivery error', emailId]
        );

        await query(
          `UPDATE campaigns
           SET failed_count = failed_count + 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [campaignId]
        );

        elasticsearchWorkerService
          .updateEmailStatus(emailId, 'failed', null, null, error.message)
          .catch(() => {});
      }

      throw error; // Re-throw to trigger BullMQ retry/backoff
    }
  }
}
