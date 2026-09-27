import { Router } from 'express';
import { SenderController } from '../controllers/sender.controller';
import { authenticate } from '../middleware/auth.middleware';

export const senderRouter = Router();

senderRouter.get('/', authenticate, SenderController.getSenders);
senderRouter.post('/', authenticate, SenderController.createSender);
