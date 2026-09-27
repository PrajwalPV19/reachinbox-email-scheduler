import { v4 as uuidv4 } from 'uuid';
import { withTransaction, query } from '../db/client';
import { QueueService } from './queue.service';
import { elasticsearchService } from './elasticsearch.service';
import { logger } from '../utils/logger';
import {
  CreateCampaignDto,
  Campaign,
  Email,
  Sender,
  EmailJobData,
} from '@reachinbox/shared';

export class CampaignService {
  public static async createCampaign(
    userId: string,
    dto: CreateCampaignDto
  ): Promise<{ campaign: Campaign; emailCount: number }> {
    const campaignId = uuidv4();
    const startTimeDate = new Date(dto.startTime);
    const startEpoch = startTimeDate.getTime();
    const delayMs = dto.delayMs;
    const hourlyLimit = dto.hourlyLimit;

    // Resolve sender
    let sender: Sender | null = null;
    if (dto.senderId) {
      const senderRes = await query<Sender>(
        'SELECT * FROM senders WHERE id = $1 AND user_id = $2 LIMIT 1',
        [dto.senderId, userId]
      );
      sender = senderRes.rows[0] || null;
    }

    if (!sender) {
      const defaultSenderRes = await query<Sender>(
        'SELECT * FROM senders WHERE user_id = $1 AND active = TRUE ORDER BY created_at ASC LIMIT 1',
        [userId]
      );
      sender = defaultSenderRes.rows[0] || null;
    }

    const senderId = sender?.id || null;
    const senderEmail = sender?.email || 'noreply@reachinbox.ai';

    // Filter and sanitize recipients
    const uniqueRecipients = Array.from(
      new Set(dto.recipients.map((r) => r.trim().toLowerCase()))
    ).filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

    if (uniqueRecipients.length === 0) {
      throw new Error('No valid recipients provided');
    }

    logger.info(
      { campaignId, recipientCount: uniqueRecipients.length, startTime: dto.startTime },
      'Scheduling campaign with delayed email jobs'
    );

    const now = Date.now();
    const emailsToCreate: Email[] = [];
    const queueJobsPayload: Array<{ data: EmailJobData; delayMs: number }> = [];

    // Calculate schedule and prepare records
    uniqueRecipients.forEach((recipient, index) => {
      const emailId = uuidv4();
      const scheduledEpoch = startEpoch + index * delayMs;
      const scheduledAt = new Date(scheduledEpoch);
      const idempotencyKey = `email_${campaignId}_${recipient}_${index}`;
      const delayFromNow = Math.max(0, scheduledEpoch - now);

      const emailRecord: Email = {
        id: emailId,
        campaignId,
        senderId: senderId || undefined,
        senderEmail,
        userId,
        recipient,
        subject: dto.subject,
        body: dto.body,
        scheduledAt,
        status: 'scheduled',
        attempts: 0,
        idempotencyKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      emailsToCreate.push(emailRecord);

      queueJobsPayload.push({
        data: {
          emailId,
          campaignId,
          userId,
          senderId: senderId || undefined,
          recipient,
          subject: dto.subject,
          body: dto.body,
          scheduledAt: scheduledAt.toISOString(),
          delayBetweenEmailsMs: delayMs,
          hourlyLimit,
        },
        delayMs: delayFromNow,
      });
    });

    // Save campaign and emails in a single database transaction
    const savedCampaign = await withTransaction(async (client) => {
      const campRes = await client.query<Campaign>(
        `INSERT INTO campaigns
         (id, user_id, subject, body, start_time, delay_ms, hourly_limit, total_emails, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled')
         RETURNING *`,
        [
          campaignId,
          userId,
          dto.subject,
          dto.body,
          startTimeDate,
          delayMs,
          hourlyLimit,
          uniqueRecipients.length,
        ]
      );

      // Bulk insert emails in batches
      const batchSize = 200;
      for (let i = 0; i < emailsToCreate.length; i += batchSize) {
        const batch = emailsToCreate.slice(i, i + batchSize);
        const valuePlaceholders: string[] = [];
        const flatValues: any[] = [];

        batch.forEach((em, idx) => {
          const offset = idx * 9;
          valuePlaceholders.push(
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
          );
          flatValues.push(
            em.id,
            em.campaignId,
            em.senderId || null,
            em.userId,
            em.recipient,
            em.subject,
            em.body,
            em.scheduledAt,
            em.idempotencyKey
          );
        });

        await client.query(
          `INSERT INTO emails
           (id, campaign_id, sender_id, user_id, recipient, subject, body, scheduled_at, idempotency_key)
           VALUES ${valuePlaceholders.join(', ')}`,
          flatValues
        );
      }

      return campRes.rows[0];
    });

    // Enqueue BullMQ delayed jobs
    try {
      await QueueService.addEmailJobsBulk(queueJobsPayload);
    } catch (queueErr) {
      logger.error({ queueErr, campaignId }, 'Failed to add jobs to BullMQ');
      throw new Error('Failed to register delayed jobs with message queue');
    }

    // Index into Elasticsearch asynchronously (non-blocking)
    elasticsearchService.bulkIndexEmails(emailsToCreate).catch((err) => {
      logger.warn({ err }, 'Background Elasticsearch indexing error');
    });

    return {
      campaign: savedCampaign,
      emailCount: uniqueRecipients.length,
    };
  }

  public static async getCampaigns(userId: string): Promise<Campaign[]> {
    const res = await query<Campaign>(
      `SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  public static async getCampaignById(campaignId: string, userId: string): Promise<Campaign | null> {
    const res = await query<Campaign>(
      `SELECT * FROM campaigns WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [campaignId, userId]
    );
    return res.rows[0] || null;
  }
}
