import axios from 'axios';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { query } from '../db/client';
import { logger } from '../utils/logger';
import { User } from '@reachinbox/shared';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export class AuthService {
  public static getGoogleAuthUrl(): string {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: config.google.callbackUrl,
      client_id: config.google.clientId,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };

    const qs = new URLSearchParams(options).toString();
    return `${rootUrl}?${qs}`;
  }

  public static async handleGoogleCallback(code: string): Promise<{ token: string; user: User }> {
    try {
      // Exchange authorization code for tokens
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          code,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          redirect_uri: config.google.callbackUrl,
          grant_type: 'authorization_code',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { access_token } = tokenResponse.data;

      // Fetch user profile from Google API
      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const googleUser = userResponse.data;
      const user = await this.upsertGoogleUser({
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split('@')[0],
        avatarUrl: googleUser.picture,
      });

      const token = this.generateToken(user);
      return { token, user };
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Failed Google OAuth token exchange');
      throw new Error('Google authentication failed');
    }
  }

  public static async upsertGoogleUser(data: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<User> {
    const existing = await query<User>(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2 LIMIT 1',
      [data.googleId, data.email]
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      const updated = await query<User>(
        `UPDATE users
         SET name = $1, avatar_url = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [data.name, data.avatarUrl || user.avatarUrl, user.id]
      );
      return updated.rows[0];
    }

    const newId = uuidv4();
    const created = await query<User>(
      `INSERT INTO users (id, google_id, name, email, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [newId, data.googleId, data.name, data.email, data.avatarUrl]
    );

    // Create a default sender mailbox for this user
    await query(
      `INSERT INTO senders (id, user_id, email, name, active, hourly_limit)
       VALUES ($1, $2, $3, $4, TRUE, $5)`,
      [uuidv4(), newId, data.email, data.name, config.scheduler.maxEmailsPerHour]
    );

    return created.rows[0];
  }

  public static async getDemoUser(): Promise<{ token: string; user: User }> {
    let res = await query<User>(
      `SELECT * FROM users WHERE email = 'demo@reachinbox.ai' LIMIT 1`
    );

    let user: User;
    if (res.rows.length === 0) {
      user = await this.upsertGoogleUser({
        googleId: 'demo-google-id',
        email: 'demo@reachinbox.ai',
        name: 'ReachInbox Demo User',
        avatarUrl: 'https://ui-avatars.com/api/?name=ReachInbox+User&background=6366f1&color=fff',
      });
    } else {
      user = res.rows[0];
    }

    const token = this.generateToken(user);
    return { token, user };
  }

  public static generateToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  public static verifyToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  }

  public static async getUserById(userId: string): Promise<User | null> {
    const res = await query<User>('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
    return res.rows[0] || null;
  }
}
