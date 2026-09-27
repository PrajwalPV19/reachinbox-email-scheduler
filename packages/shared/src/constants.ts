export const QUEUE_NAMES = {
  EMAIL_QUEUE: 'reachinbox-email-queue',
} as const;

export const DEFAULT_CONFIG = {
  MIN_EMAIL_DELAY_MS: 2000,
  MAX_EMAILS_PER_HOUR: 100,
  WORKER_CONCURRENCY: 5,
  MAX_ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5000,
} as const;

export const REDIS_KEYS = {
  SENDER_RATE_LIMIT: (senderId: string, hourTimestamp: number) => 
    `ratelimit:sender:${senderId}:${hourTimestamp}`,
  SENDER_LAST_SENT: (senderId: string) => 
    `lastsent:sender:${senderId}`,
  GLOBAL_RATE_LIMIT: (hourTimestamp: number) => 
    `ratelimit:global:${hourTimestamp}`,
  RATE_LIMIT_NOTIFIED: (senderId: string, hourTimestamp: number) => 
    `notified:slack:${senderId}:${hourTimestamp}`,
  IDEMPOTENCY_LOCK: (idempotencyKey: string) => 
    `idempotency:lock:${idempotencyKey}`,
} as const;
