import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { REDIS_KEYS } from '@reachinbox/shared';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  hourlyLimit: number;
  nextWindowEpoch: number;
}

export class RateLimiterService {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  public async checkAndIncrementRateLimit(
    senderId: string,
    hourlyLimit: number = config.maxEmailsPerHour
  ): Promise<RateLimitCheckResult> {
    const now = Date.now();
    const hourWindow = Math.floor(now / 3600000);
    const key = REDIS_KEYS.SENDER_RATE_LIMIT(senderId, hourWindow);
    const nextWindowEpoch = (hourWindow + 1) * 3600000;

    // Atomic Lua script to increment counter and set 2-hour TTL if key is new
    const luaScript = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], 7200)
      end
      return current
    `;

    const currentCount = (await this.redis.eval(luaScript, 1, key)) as number;

    if (currentCount > hourlyLimit) {
      logger.warn(
        { senderId, currentCount, hourlyLimit, hourWindow },
        'Sender hourly rate limit threshold exceeded'
      );
      return {
        allowed: false,
        currentCount,
        hourlyLimit,
        nextWindowEpoch,
      };
    }

    return {
      allowed: true,
      currentCount,
      hourlyLimit,
      nextWindowEpoch,
    };
  }

  public async enforceMinDelay(
    senderId: string,
    minDelayMs: number = config.minEmailDelayMs
  ): Promise<void> {
    const key = REDIS_KEYS.SENDER_LAST_SENT(senderId);
    const now = Date.now();

    // Check last sent timestamp
    const lastSentStr = await this.redis.get(key);
    if (lastSentStr) {
      const lastSent = parseInt(lastSentStr, 10);
      const elapsed = now - lastSent;
      if (elapsed < minDelayMs) {
        const waitTime = minDelayMs - elapsed;
        logger.debug({ senderId, waitTime }, 'Enforcing minimum delay between emails');
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Update last sent timestamp
    await this.redis.set(key, Date.now().toString(), 'EX', 3600);
  }

  public async shouldNotifySlack(senderId: string, hourWindow: number): Promise<boolean> {
    const key = REDIS_KEYS.RATE_LIMIT_NOTIFIED(senderId, hourWindow);
    // SET NX ensures we only send one alert per sender per hour window
    const result = await this.redis.set(key, '1', 'EX', 7200, 'NX');
    return result === 'OK';
  }
}
