import { Router } from 'express';
import { SlackController } from '../controllers/slack.controller';
import { authenticate } from '../middleware/auth.middleware';

export const slackRouter = Router();

slackRouter.get('/connect', authenticate, SlackController.connectSlack);
slackRouter.get('/callback', SlackController.slackCallback);
slackRouter.get('/status', authenticate, SlackController.getSlackStatus);
slackRouter.post('/disconnect', authenticate, SlackController.disconnectSlack);
slackRouter.post('/test', authenticate, SlackController.testSlackNotification);
