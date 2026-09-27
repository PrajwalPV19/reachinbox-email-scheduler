import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { config } from '../config';
import { logger } from '../utils/logger';
import { QUEUE_NAMES, EmailJobData } from '@reachinbox/shared';

const isTls = config.redis.url.startsWith('rediss://');

export const redisConnection = config.redis.url && config.redis.url !== 'redis://localhost:6379'
  ? new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
    })
  : new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

redisConnection.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 2000,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 2000,
    },
  },
});

export class QueueService {
  public static async addEmailJob(data: EmailJobData, delayMs: number): Promise<string> {
    const jobId = `email:${data.emailId}`;
    const job = await emailQueue.add('send-email', data, {
      jobId,
      delay: Math.max(0, delayMs),
    });
    logger.debug({ jobId, delayMs, recipient: data.recipient }, 'Queued email job');
    return job.id || jobId;
  }

  public static async addEmailJobsBulk(
    items: Array<{ data: EmailJobData; delayMs: number }>
  ): Promise<string[]> {
    const jobs = items.map((item) => ({
      name: 'send-email',
      data: item.data,
      opts: {
        jobId: `email:${item.data.emailId}`,
        delay: Math.max(0, item.delayMs),
      },
    }));

    const queuedJobs = await emailQueue.addBulk(jobs);
    logger.info({ count: queuedJobs.length }, 'Bulk queued email jobs');
    return queuedJobs.map((j) => j.id!);
  }

  public static async getQueueCounts() {
    const counts = await emailQueue.getJobCounts(
      'waiting',
      'active',
      'delayed',
      'completed',
      'failed'
    );
    return counts;
  }

  public static setupBullBoard(): ExpressAdapter {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [new BullMQAdapter(emailQueue) as any],
      serverAdapter,
    });

    return serverAdapter;
  }

  public static async checkHealth(): Promise<boolean> {
    try {
      const pong = await redisConnection.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}
