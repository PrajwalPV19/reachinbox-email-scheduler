import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { authenticate } from '../middleware/auth.middleware';

export const emailRouter = Router();

emailRouter.get('/scheduled', authenticate, EmailController.getScheduledEmails);
emailRouter.get('/sent', authenticate, EmailController.getSentEmails);
emailRouter.get('/search', authenticate, EmailController.searchEmails);
emailRouter.get('/stats', authenticate, EmailController.getStats);
