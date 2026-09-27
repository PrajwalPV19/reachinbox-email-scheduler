import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.env === 'test' ? 'silent' : 'info',
  transport:
    config.env === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});
