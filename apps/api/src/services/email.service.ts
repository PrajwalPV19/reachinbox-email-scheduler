import { query } from '../db/client';
import { Email } from '@reachinbox/shared';

export class EmailService {
  public static async getScheduledEmails(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ emails: Email[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    const countRes = await query(
      `SELECT COUNT(*) FROM emails WHERE user_id = $1 AND status IN ('scheduled', 'processing', 'rescheduled')`,
      [userId]
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const res = await query(
      `SELECT e.*, s.email as sender_email
       FROM emails e
       LEFT JOIN senders s ON e.sender_id = s.id
       WHERE e.user_id = $1 AND e.status IN ('scheduled', 'processing', 'rescheduled')
       ORDER BY e.scheduled_at ASC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const emails: Email[] = res.rows.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      senderId: row.sender_id,
      senderEmail: row.sender_email,
      userId: row.user_id,
      recipient: row.recipient,
      subject: row.subject,
      body: row.body,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      status: row.status,
      attempts: row.attempts,
      bullJobId: row.bull_job_id,
      idempotencyKey: row.idempotency_key,
      etherealPreviewUrl: row.ethereal_preview_url,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      emails,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public static async getSentEmails(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ emails: Email[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    const countRes = await query(
      `SELECT COUNT(*) FROM emails WHERE user_id = $1 AND status IN ('sent', 'failed')`,
      [userId]
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const res = await query(
      `SELECT e.*, s.email as sender_email
       FROM emails e
       LEFT JOIN senders s ON e.sender_id = s.id
       WHERE e.user_id = $1 AND e.status IN ('sent', 'failed')
       ORDER BY COALESCE(e.sent_at, e.updated_at) DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const emails: Email[] = res.rows.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      senderId: row.sender_id,
      senderEmail: row.sender_email,
      userId: row.user_id,
      recipient: row.recipient,
      subject: row.subject,
      body: row.body,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      status: row.status,
      attempts: row.attempts,
      bullJobId: row.bull_job_id,
      idempotencyKey: row.idempotency_key,
      etherealPreviewUrl: row.ethereal_preview_url,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      emails,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public static async getEmailStats(userId: string): Promise<{
    scheduled: number;
    sent: number;
    failed: number;
    total: number;
  }> {
    const res = await query(
      `SELECT
         COUNT(CASE WHEN status IN ('scheduled', 'processing', 'rescheduled') THEN 1 END) as scheduled,
         COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
         COUNT(*) as total
       FROM emails
       WHERE user_id = $1`,
      [userId]
    );

    return {
      scheduled: parseInt(res.rows[0]?.scheduled || '0', 10),
      sent: parseInt(res.rows[0]?.sent || '0', 10),
      failed: parseInt(res.rows[0]?.failed || '0', 10),
      total: parseInt(res.rows[0]?.total || '0', 10),
    };
  }
}
