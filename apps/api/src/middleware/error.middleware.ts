import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(
    {
      err: err.message || err,
      stack: config.env === 'development' ? err.stack : undefined,
      url: req.originalUrl,
      method: req.method,
    },
    'Unhandled server error'
  );

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message,
      ...(config.env === 'development' && { stack: err.stack }),
    },
  });
};
