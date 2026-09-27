import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Email, EmailSearchResult } from '@reachinbox/shared';
import { query as dbQuery } from '../db/client';

export class ElasticsearchService {
  private client: Client;
  private isConnected: boolean = false;
  private readonly indexName = 'emails';

  constructor() {
    this.client = new Client({
      node: config.elasticsearch.node,
      maxRetries: 3,
      requestTimeout: 5000,
    });
  }

  public async initIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                campaignId: { type: 'keyword' },
                userId: { type: 'keyword' },
                senderId: { type: 'keyword' },
                senderEmail: { type: 'keyword' },
                recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                subject: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                etherealPreviewUrl: { type: 'keyword', index: false },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        logger.info({ index: this.indexName }, 'Elasticsearch emails index created');
      }
      this.isConnected = true;
    } catch (error) {
      logger.warn({ error }, 'Elasticsearch initialization failed or not ready; search fallback enabled');
      this.isConnected = false;
    }
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const health = await this.client.cluster.health({});
      return health.status !== 'red';
    } catch {
      return false;
    }
  }

  public async indexEmail(email: Email): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id: email.id,
        document: {
          id: email.id,
          campaignId: email.campaignId,
          userId: email.userId,
          senderId: email.senderId,
          senderEmail: email.senderEmail,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt,
          sentAt: email.sentAt,
          etherealPreviewUrl: email.etherealPreviewUrl,
          createdAt: email.createdAt,
        },
      });
      logger.debug({ emailId: email.id }, 'Indexed email into Elasticsearch');
    } catch (error) {
      logger.warn({ emailId: email.id, error }, 'Failed to index email to Elasticsearch');
    }
  }

  public async bulkIndexEmails(emails: Email[]): Promise<void> {
    if (!emails.length) return;
    try {
      const operations = emails.flatMap((doc) => [
        { index: { _index: this.indexName, _id: doc.id } },
        {
          id: doc.id,
          campaignId: doc.campaignId,
          userId: doc.userId,
          senderId: doc.senderId,
          senderEmail: doc.senderEmail,
          recipient: doc.recipient,
          subject: doc.subject,
          body: doc.body,
          status: doc.status,
          scheduledAt: doc.scheduledAt,
          sentAt: doc.sentAt,
          etherealPreviewUrl: doc.etherealPreviewUrl,
          createdAt: doc.createdAt,
        },
      ]);
      const bulkResponse = await this.client.bulk({ refresh: true, operations });
      if (bulkResponse.errors) {
        logger.warn('Some documents failed in Elasticsearch bulk indexing');
      } else {
        logger.info({ count: emails.length }, 'Bulk indexed emails into Elasticsearch');
      }
    } catch (error) {
      logger.warn({ count: emails.length, error }, 'Failed to bulk index emails into Elasticsearch');
    }
  }

  public async updateEmailStatus(
    emailId: string,
    status: string,
    sentAt?: Date | string | null,
    etherealPreviewUrl?: string | null,
    failureReason?: string | null
  ): Promise<void> {
    try {
      await this.client.update({
        index: this.indexName,
        id: emailId,
        doc: {
          status,
          sentAt: sentAt || null,
          etherealPreviewUrl: etherealPreviewUrl || null,
          failureReason: failureReason || null,
        },
      });
    } catch (error) {
      logger.warn({ emailId, error }, 'Failed to update email status in Elasticsearch');
    }
  }

  public async searchEmails(
    userId: string,
    searchTerm: string,
    status?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<EmailSearchResult> {
    const from = (page - 1) * limit;

    try {
      const mustClauses: any[] = [{ term: { userId } }];

      if (searchTerm && searchTerm.trim().length > 0) {
        mustClauses.push({
          multi_match: {
            query: searchTerm.trim(),
            fields: ['recipient^3', 'subject^2', 'body'],
            fuzziness: 'AUTO',
          },
        });
      }

      if (status) {
        mustClauses.push({ term: { status } });
      }

      const response = await this.client.search({
        index: this.indexName,
        from,
        size: limit,
        sort: [{ scheduledAt: { order: 'desc' } }],
        query: {
          bool: {
            must: mustClauses,
          },
        },
      });

      const totalHits =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      const emails: Email[] = response.hits.hits.map((hit: any) => ({
        id: hit._source.id,
        campaignId: hit._source.campaignId,
        userId: hit._source.userId,
        senderId: hit._source.senderId,
        senderEmail: hit._source.senderEmail,
        recipient: hit._source.recipient,
        subject: hit._source.subject,
        body: hit._source.body,
        scheduledAt: hit._source.scheduledAt,
        sentAt: hit._source.sentAt,
        status: hit._source.status,
        attempts: hit._source.attempts || 0,
        idempotencyKey: hit._source.id,
        etherealPreviewUrl: hit._source.etherealPreviewUrl,
        createdAt: hit._source.createdAt,
        updatedAt: hit._source.createdAt,
      }));

      return {
        total: totalHits,
        emails,
        page,
        totalPages: Math.ceil(totalHits / limit) || 1,
      };
    } catch (error) {
      logger.warn({ error, searchTerm }, 'Elasticsearch search failed; falling back to PostgreSQL');
      return this.searchPostgresFallback(userId, searchTerm, status, page, limit);
    }
  }

  private async searchPostgresFallback(
    userId: string,
    searchTerm: string,
    status?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<EmailSearchResult> {
    const offset = (page - 1) * limit;
    const params: any[] = [userId];
    let whereClause = 'WHERE user_id = $1';

    if (searchTerm && searchTerm.trim().length > 0) {
      params.push(`%${searchTerm.trim()}%`);
      whereClause += ` AND (recipient ILIKE $${params.length} OR subject ILIKE $${params.length} OR body ILIKE $${params.length})`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    const countRes = await dbQuery(
      `SELECT COUNT(*) FROM emails ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    params.push(limit);
    params.push(offset);
    const emailsRes = await dbQuery(
      `SELECT * FROM emails ${whereClause} ORDER BY scheduled_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const emails: Email[] = emailsRes.rows.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      userId: row.user_id,
      senderId: row.sender_id,
      recipient: row.recipient,
      subject: row.subject,
      body: row.body,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      status: row.status,
      attempts: row.attempts,
      idempotencyKey: row.idempotency_key,
      etherealPreviewUrl: row.ethereal_preview_url,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      total,
      emails,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const elasticsearchService = new ElasticsearchService();
