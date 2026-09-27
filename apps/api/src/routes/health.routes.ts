import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../db/client';
import { QueueService } from '../services/queue.service';
import { elasticsearchService } from '../services/elasticsearch.service';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  const [db, redis, es] = await Promise.all([
    checkDatabaseHealth(),
    QueueService.checkHealth(),
    elasticsearchService.checkHealth(),
  ]);

  const healthy = db && redis;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    services: {
      database: db ? 'up' : 'down',
      redis: redis ? 'up' : 'down',
      elasticsearch: es ? 'up' : 'down (fallback mode)',
    },
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/database', async (req: Request, res: Response) => {
  const ok = await checkDatabaseHealth();
  res.status(ok ? 200 : 503).json({ status: ok ? 'up' : 'down' });
});

healthRouter.get('/redis', async (req: Request, res: Response) => {
  const ok = await QueueService.checkHealth();
  res.status(ok ? 200 : 503).json({ status: ok ? 'up' : 'down' });
});

healthRouter.get('/elasticsearch', async (req: Request, res: Response) => {
  const ok = await elasticsearchService.checkHealth();
  res.status(ok ? 200 : 503).json({ status: ok ? 'up' : 'down' });
});
