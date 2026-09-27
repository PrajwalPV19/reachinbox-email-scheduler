import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { QueueService } from './services/queue.service';
import { authRouter } from './routes/auth.routes';
import { campaignRouter } from './routes/campaign.routes';
import { emailRouter } from './routes/email.routes';
import { slackRouter } from './routes/slack.routes';
import { senderRouter } from './routes/sender.routes';
import { healthRouter } from './routes/health.routes';
import { errorHandler } from './middleware/error.middleware';

export const createApp = (): express.Application => {
  const app = express();

  // Basic security and parsing middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false, // Required for Bull Board static assets
    })
  );

  app.use(
    cors({
      origin: [config.frontendUrl, 'http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Bull Board queue dashboard UI
  const bullBoardAdapter = QueueService.setupBullBoard();
  app.use('/admin/queues', bullBoardAdapter.getRouter());

  // API Routes
  app.use('/auth', authRouter);
  app.use('/campaigns', campaignRouter);
  app.use('/emails', emailRouter);
  app.use('/slack', slackRouter);
  app.use('/senders', senderRouter);
  app.use('/health', healthRouter);

  // Central error handling
  app.use(errorHandler);

  return app;
};
