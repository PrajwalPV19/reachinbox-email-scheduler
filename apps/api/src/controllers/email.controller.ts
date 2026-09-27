import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';
import { elasticsearchService } from '../services/elasticsearch.service';

export class EmailController {
  public static async getScheduledEmails(req: Request, res: Response) {
    const userId = req.user!.userId;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);

    const data = await EmailService.getScheduledEmails(userId, page, limit);
    res.json({
      success: true,
      data,
    });
  }

  public static async getSentEmails(req: Request, res: Response) {
    const userId = req.user!.userId;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);

    const data = await EmailService.getSentEmails(userId, page, limit);
    res.json({
      success: true,
      data,
    });
  }

  public static async searchEmails(req: Request, res: Response) {
    const userId = req.user!.userId;
    const q = (req.query.q as string) || '';
    const status = req.query.status as string | undefined;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);

    const result = await elasticsearchService.searchEmails(userId, q, status, page, limit);
    res.json({
      success: true,
      data: result,
    });
  }

  public static async getStats(req: Request, res: Response) {
    const userId = req.user!.userId;
    const stats = await EmailService.getEmailStats(userId);
    res.json({
      success: true,
      data: stats,
    });
  }
}
