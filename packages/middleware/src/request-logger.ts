import { Request, Response, NextFunction } from 'express';
import { UUIDHelper } from '@nm/shared';
import { LoggerFactory } from '@nm/logger';

const logger = LoggerFactory.getLogger('RequestLogger');

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const reqId = req.headers['x-request-id'] || UUIDHelper.generate();
  req.headers['x-request-id'] = reqId;

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      {
        reqId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
      },
      'Request completed',
    );
  });

  next();
};
