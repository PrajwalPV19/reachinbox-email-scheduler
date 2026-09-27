import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/client';
import { Sender } from '@reachinbox/shared';

export class SenderController {
  public static async getSenders(req: Request, res: Response) {
    const userId = req.user!.userId;
    const resSenders = await query<Sender>(
      'SELECT id, user_id, email, name, active, hourly_limit, created_at, updated_at FROM senders WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    res.json({
      success: true,
      data: resSenders.rows,
    });
  }

  public static async createSender(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { email, name, hourlyLimit, smtpHost, smtpPort, smtpUser, smtpPass } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Valid email address is required' },
      });
    }

    const newId = uuidv4();
    const created = await query<Sender>(
      `INSERT INTO senders (id, user_id, email, name, hourly_limit, smtp_host, smtp_port, smtp_user, smtp_pass)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, email, name, active, hourly_limit, created_at, updated_at`,
      [newId, userId, email, name || null, hourlyLimit || 100, smtpHost || null, smtpPort || 587, smtpUser || null, smtpPass || null]
    );

    res.status(201).json({
      success: true,
      data: created.rows[0],
    });
  }
}
