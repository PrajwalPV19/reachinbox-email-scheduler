import { z } from 'zod';

export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed' | 'rescheduled';
export type CampaignStatus = 'scheduled' | 'running' | 'completed' | 'paused' | 'failed';

export interface User {
  id: string;
  googleId?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Sender {
  id: string;
  userId: string;
  email: string;
  name?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  active: boolean;
  hourlyLimit: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SlackConnection {
  id: string;
  userId: string;
  teamId?: string;
  teamName?: string;
  channelId?: string;
  channelName?: string;
  accessToken: string;
  incomingWebhookUrl?: string;
  connected: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Campaign {
  id: string;
  userId: string;
  name?: string;
  subject: string;
  body: string;
  startTime: Date | string;
  delayMs: number;
  hourlyLimit: number;
  totalEmails: number;
  sentCount: number;
  failedCount: number;
  status: CampaignStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Email {
  id: string;
  campaignId: string;
  senderId?: string;
  senderEmail?: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date | string;
  sentAt?: Date | string | null;
  status: EmailStatus;
  attempts: number;
  bullJobId?: string | null;
  idempotencyKey: string;
  providerMessageId?: string | null;
  etherealPreviewUrl?: string | null;
  failureReason?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EmailJobData {
  emailId: string;
  campaignId: string;
  userId: string;
  senderId?: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  delayBetweenEmailsMs: number;
  hourlyLimit: number;
  attempt?: number;
}

export interface CsvParseResult {
  totalRows: number;
  validEmails: number;
  invalidEmails: number;
  duplicates: number;
  emails: string[];
}

export interface EmailSearchResult {
  total: number;
  emails: Email[];
  page: number;
  totalPages: number;
}

export const CreateCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start time ISO format',
  }),
  delayMs: z.number().int().min(100).default(2000),
  hourlyLimit: z.number().int().min(1).max(5000).default(100),
  senderId: z.string().optional(),
  recipients: z.array(z.string().email('Invalid email')).min(1, 'At least 1 recipient is required'),
});

export type CreateCampaignDto = z.infer<typeof CreateCampaignSchema>;
