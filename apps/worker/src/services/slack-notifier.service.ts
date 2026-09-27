import axios from 'axios';
import { query } from '../db/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { SlackConnection } from '@reachinbox/shared';

export class SlackNotifierService {
  public static async notifyRateLimitHit(
    userId: string,
    senderEmail: string,
    hourlyLimit: number,
    nextWindowEpoch: number
  ): Promise<boolean> {
    try {
      const connRes = await query<SlackConnection>(
        'SELECT * FROM slack_connections WHERE user_id = $1 AND connected = TRUE LIMIT 1',
        [userId]
      );

      const conn = connRes.rows[0];
      if (!conn) {
        logger.debug({ userId }, 'No connected Slack workspace found for rate limit alert');
        return false;
      }

      const nextWindowTime = new Date(nextWindowEpoch);
      const formattedTime = nextWindowTime.toTimeString().split(' ')[0] + ' UTC';

      const payload = {
        text: `⚠️ *ReachInbox Rate Limit Alert*: Sender \`${senderEmail}\` has exceeded the limit of *${hourlyLimit} emails/hour*.\nRemaining scheduled emails have been automatically postponed to *${formattedTime}*.`,
      };

      if (conn.incomingWebhookUrl) {
        await axios.post(conn.incomingWebhookUrl, payload, { timeout: 5000 });
      } else if (conn.accessToken && conn.channelId) {
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: conn.channelId,
            text: payload.text,
          },
          {
            headers: { Authorization: `Bearer ${conn.accessToken}` },
            timeout: 5000,
          }
        );
      } else if (config.slack.webhookUrl) {
        await axios.post(config.slack.webhookUrl, payload, { timeout: 5000 });
      }

      logger.info({ userId, senderEmail }, 'Dispatched real Slack rate-limit alert');
      return true;
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Failed to deliver Slack notification');
      return false;
    }
  }
}
