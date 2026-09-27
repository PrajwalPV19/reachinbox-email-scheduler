import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { logger } from '../utils/logger';

export class ElasticsearchWorkerService {
  private client: Client;
  private readonly indexName = 'emails';

  constructor() {
    this.client = new Client({
      node: config.elasticsearch.node,
      maxRetries: 3,
      requestTimeout: 5000,
    });
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
      logger.debug({ emailId, status }, 'Updated email status in Elasticsearch');
    } catch (error) {
      logger.warn({ emailId, error }, 'Failed to update email status in Elasticsearch');
    }
  }
}

export const elasticsearchWorkerService = new ElasticsearchWorkerService();
