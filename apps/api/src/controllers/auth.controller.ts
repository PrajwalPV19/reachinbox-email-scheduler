import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { config } from '../config';

export class AuthController {
  public static async googleLogin(req: Request, res: Response) {
    if (!config.google.clientId || config.google.clientId.includes('your-google-client-id')) {
      // In local dev without credentials, provide immediate demo sign-in
      const { token } = await AuthService.getDemoUser();
      res.cookie('token', token, { httpOnly: true, secure: config.env === 'production' });
      return res.redirect(`${config.frontendUrl}?token=${token}`);
    }
    const url = AuthService.getGoogleAuthUrl();
    res.redirect(url);
  }

  public static async googleCallback(req: Request, res: Response) {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.redirect(`${config.frontendUrl}?error=missing_oauth_code`);
    }

    try {
      const { token } = await AuthService.handleGoogleCallback(code);
      res.cookie('token', token, { httpOnly: true, secure: config.env === 'production' });
      res.redirect(`${config.frontendUrl}?token=${token}`);
    } catch (error) {
      res.redirect(`${config.frontendUrl}?error=google_auth_failed`);
    }
  }

  public static async devLogin(req: Request, res: Response) {
    const { token, user } = await AuthService.getDemoUser();
    res.cookie('token', token, { httpOnly: true, secure: config.env === 'production' });
    res.json({
      success: true,
      data: { token, user },
    });
  }

  public static async getMe(req: Request, res: Response) {
    const userId = req.user!.userId;
    const user = await AuthService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User does not exist' },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  }

  public static async logout(req: Request, res: Response) {
    res.clearCookie('token');
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}
