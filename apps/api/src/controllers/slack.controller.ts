import { Request, Response } from 'express';
import { SlackService } from '../services/slack.service';
import { config } from '../config';

export class SlackController {
  public static connectSlack(req: Request, res: Response) {
    const userId = req.user!.userId;
    if (!config.slack.clientId || config.slack.clientId.includes('your-slack-client-id')) {
      // If local dev without credentials, provide mock/webhook connection helper
      return res.json({
        success: true,
        authUrl: `${config.slack.redirectUri}?code=mock_slack_code&state=${userId}`,
      });
    }
    const url = SlackService.getAuthorizationUrl(userId);
    res.json({
      success: true,
      authUrl: url,
    });
  }

  public static async slackCallback(req: Request, res: Response) {
    const code = req.query.code as string;
    const userId = (req.query.state as string) || req.user?.userId;

    if (!code || !userId) {
      return res.redirect(`${config.frontendUrl}?slack_error=invalid_callback`);
    }

    try {
      if (code === 'mock_slack_code') {
        // Connect mock webhook for demo testing
        await SlackService.saveConnection({
          userId,
          teamId: 'T_REACHINBOX_DEMO',
          teamName: 'ReachInbox Workspace',
          channelId: 'C_NOTIFICATIONS',
          channelName: '#outbox-alerts',
          accessToken: 'mock_slack_token',
          incomingWebhookUrl: config.slack.webhookUrl || 'https://hooks.slack.com/services/mock',
        });
      } else {
        await SlackService.handleCallback(code, userId);
      }
      res.redirect(`${config.frontendUrl}?slack=connected`);
    } catch (error) {
      res.redirect(`${config.frontendUrl}?slack_error=connection_failed`);
    }
  }

  public static async getSlackStatus(req: Request, res: Response) {
    const userId = req.user!.userId;
    const connection = await SlackService.getConnection(userId);
    res.json({
      success: true,
      data: {
        connected: Boolean(connection && connection.connected),
        teamName: connection?.teamName,
        channelName: connection?.channelName,
      },
    });
  }

  public static async disconnectSlack(req: Request, res: Response) {
    const userId = req.user!.userId;
    await SlackService.disconnect(userId);
    res.json({
      success: true,
      message: 'Slack disconnected',
    });
  }

  public static async testSlackNotification(req: Request, res: Response) {
    const userId = req.user!.userId;
    const sent = await SlackService.sendRateLimitNotification(
      userId,
      req.user!.email,
      100,
      new Date(Date.now() + 3600000)
    );
    res.json({
      success: sent,
      message: sent ? 'Slack test notification sent!' : 'Slack not connected or notification failed',
    });
  }
}
