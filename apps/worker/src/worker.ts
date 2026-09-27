import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from './config';
import { logger } from './utils/logger';
import { EmailProcessor } from './processors/email.processor';
import { QUEUE_NAMES, EmailJobData } from '@reachinbox/shared';
import { pool } from './db/client';

const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const processor = new EmailProcessor(redisClient);

const worker = new Worker<EmailJobData>(
  QUEUE_NAMES.EMAIL_QUEUE,
  async (job) => {
    return processor.process(job);
  },
  {
    connection: redisClient,
    concurrency: config.workerConcurrency,
    limiter: {
      max: config.maxEmailsPerHour,
      duration: 3600000,
    },
  }
);

worker.on('ready', () => {
  logger.info(
    {
      queue: QUEUE_NAMES.EMAIL_QUEUE,
      concurrency: config.workerConcurrency,
      minDelayMs: config.minEmailDelayMs,
      maxHourlyRate: config.maxEmailsPerHour,
    },
    '⚡ BullMQ Email Worker started successfully'
  );
});

worker.on('completed', (job) => {
  logger.info({ jobId: job.id, recipient: job.data.recipient }, 'Job completed successfully');
});

worker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      recipient: job?.data.recipient,
      attemptsMade: job?.attemptsMade,
      error: err.message,
    },
    'Job execution failed'
  );
});

worker.on('error', (err) => {
  logger.error({ err }, 'BullMQ Worker encountered an unexpected error');
});

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down worker gracefully...`);
  try {
    await worker.close();
    await redisClient.quit();
    await pool.end();
    logger.info('Worker, Redis, and Database connections closed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during worker shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
