import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { elasticsearchService } from './services/elasticsearch.service';

const app = createApp();

const startServer = async () => {
  try {
    // Attempt non-blocking Elasticsearch index initialization
    elasticsearchService.initIndex().catch((err) => {
      logger.warn({ err }, 'Elasticsearch index initialization deferred');
    });

    const server = app.listen(config.port, () => {
      logger.info(
        { port: config.port, env: config.env },
        `🚀 ReachInbox Email Scheduler API running at http://localhost:${config.port}`
      );
      logger.info(`📊 BullMQ Queue Dashboard available at http://localhost:${config.port}/admin/queues`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down API server gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, 'Failed to start API server');
    process.exit(1);
  }
};

startServer();
