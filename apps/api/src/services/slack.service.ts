import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { query } from '../db/client';
import { logger } from '../utils/logger';
import { SlackConnection } from '@reachinbox/shared';

export class SlackService {
  public static getAuthorizationUrl(userId: string): string {
    const rootUrl = 'https://slack.com/oauth/v2/authorize';
    const scopes = ['incoming-webhook', 'chat:write'].join(',');
    return `${rootUrl}?client_id=${config.slack.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
      config.slack.redirectUri
    )}&state=${userId}`;
  }

  public static async handleCallback(
    code: string,
    userId: string
  ): Promise<SlackConnection> {
    try {
      const response = await axios.post(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: config.slack.clientId,
          client_secret: config.slack.clientSecret,
          code,
          redirect_uri: config.slack.redirectUri,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const data = response.data;
      if (!data.ok) {
        throw new Error(data.error || 'Slack OAuth token exchange failed');
      }

      const teamId = data.team?.id;
      const teamName = data.team?.name;
      const channelId = data.incoming_webhook?.channel_id;
      const channelName = data.incoming_webhook?.channel;
      const incomingWebhookUrl = data.incoming_webhook?.url || config.slack.webhookUrl;
      const accessToken = data.access_token;

      const connection = await this.saveConnection({
        userId,
        teamId,
        teamName,
        channelId,
        channelName,
        accessToken,
        incomingWebhookUrl,
      });

      logger.info({ userId, teamName, channelName }, 'Slack connected successfully');
      return connection;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed Slack OAuth callback');
      throw error;
    }
  }

  public static async saveConnection(data: {
    userId: string;
    teamId?: string;
    teamName?: string;
    channelId?: string;
    channelName?: string;
    accessToken: string;
    incomingWebhookUrl?: string;
  }): Promise<SlackConnection> {
    const existing = await query<SlackConnection>(
      'SELECT * FROM slack_connections WHERE user_id = $1 LIMIT 1',
      [data.userId]
    );

    if (existing.rows.length > 0) {
      const updated = await query<SlackConnection>(
        `UPDATE slack_connections
         SET team_id = $1, team_name = $2, channel_id = $3, channel_name = $4,
             access_token = $5, incoming_webhook_url = $6, connected = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $7
         RETURNING *`,
        [
          data.teamId,
          data.teamName,
          data.channelId,
          data.channelName,
          data.accessToken,
          data.incomingWebhookUrl,
          data.userId,
        ]
      );
      return updated.rows[0];
    }

    const created = await query<SlackConnection>(
      `INSERT INTO slack_connections
       (id, user_id, team_id, team_name, channel_id, channel_name, access_token, incoming_webhook_url, connected)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING *`,
      [
        uuidv4(),
        data.userId,
        data.teamId,
        data.teamName,
        data.channelId,
        data.channelName,
        data.accessToken,
        data.incomingWebhookUrl,
      ]
    );

    return created.rows[0];
  }

  public static async getConnection(userId: string): Promise<SlackConnection | null> {
    const res = await query<SlackConnection>(
      'SELECT * FROM slack_connections WHERE user_id = $1 AND connected = TRUE LIMIT 1',
      [userId]
    );
    return res.rows[0] || null;
  }

  public static async disconnect(userId: string): Promise<boolean> {
    await query(
      'UPDATE slack_connections SET connected = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );
    logger.info({ userId }, 'Slack disconnected');
    return true;
  }

  public static async sendRateLimitNotification(
    userId: string,
    senderEmail: string,
    hourlyLimit: number,
    nextWindowTime: Date
  ): Promise<boolean> {
    try {
      const conn = await this.getConnection(userId);
      if (!conn || !conn.connected) {
        logger.debug({ userId }, 'No active Slack connection found, skipping rate limit alert');
        return false;
      }

      const formattedNextTime = nextWindowTime.toTimeString().split(' ')[0];
      const messageText = `⚠️ *ReachInbox Rate Limit Alert*: Sender \`${senderEmail}\` has hit the hourly threshold of *${hourlyLimit} emails/hr*.\nRemaining scheduled emails are safely queued and will automatically resume at approximately *${formattedNextTime} UTC*.`;

      if (conn.incomingWebhookUrl) {
        await axios.post(conn.incomingWebhookUrl, {
          text: messageText,
        });
      } else if (conn.accessToken && conn.channelId) {
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: conn.channelId,
            text: messageText,
          },
          {
            headers: { Authorization: `Bearer ${conn.accessToken}` },
          }
        );
      }

      logger.info({ userId, senderEmail }, 'Live Slack notification dispatched for rate limit event');
      return true;
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Failed to deliver Slack notification');
      return false;
    }
  }
}
