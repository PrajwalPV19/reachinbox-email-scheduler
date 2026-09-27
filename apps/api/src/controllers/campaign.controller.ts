import { Request, Response } from 'express';
import { CampaignService } from '../services/campaign.service';

export class CampaignController {
  public static async createCampaign(req: Request, res: Response) {
    const userId = req.user!.userId;
    const result = await CampaignService.createCampaign(userId, req.body);
    res.status(201).json({
      success: true,
      data: result,
      message: `Successfully scheduled ${result.emailCount} emails.`,
    });
  }

  public static async getCampaigns(req: Request, res: Response) {
    const userId = req.user!.userId;
    const campaigns = await CampaignService.getCampaigns(userId);
    res.json({
      success: true,
      data: campaigns,
    });
  }

  public static async getCampaignById(req: Request, res: Response) {
    const userId = req.user!.userId;
    const campaignId = req.params.id;
    const campaign = await CampaignService.getCampaignById(campaignId, userId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Campaign not found' },
      });
    }
    res.json({
      success: true,
      data: campaign,
    });
  }
}
