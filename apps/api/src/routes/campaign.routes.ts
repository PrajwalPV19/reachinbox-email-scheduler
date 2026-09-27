import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { CreateCampaignSchema } from '@reachinbox/shared';

export const campaignRouter = Router();

campaignRouter.post('/', authenticate, validateBody(CreateCampaignSchema), CampaignController.createCampaign);
campaignRouter.get('/', authenticate, CampaignController.getCampaigns);
campaignRouter.get('/:id', authenticate, CampaignController.getCampaignById);
