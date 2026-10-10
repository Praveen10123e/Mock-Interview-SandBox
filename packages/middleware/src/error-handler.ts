import { Request, Response, NextFunction } from 'express';
import { BaseError } from '@nm/errors';
import { ResponseBuilder } from '@nm/shared';
import { HTTP_STATUS, ERROR_MESSAGES } from '@nm/constants';
import { LoggerFactory } from '@nm/logger';

const logger = LoggerFactory.getLogger('ErrorHandler');

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof BaseError) {
    if (!err.isOperational) {
      logger.error({ err, reqId: req.headers['x-request-id'] }, 'Non-operational error caught');
    } else {
      logger.warn(
        { err: err.message, reqId: req.headers['x-request-id'] },
        'Operational error caught',
      );
    }

    return res
      .status(err.statusCode)
      .json(ResponseBuilder.error(err.name, err.message, err.details));
  }

  logger.error({ err, reqId: req.headers['x-request-id'] }, 'Unhandled error caught');

  return res
    .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    .json(ResponseBuilder.error('InternalServerError', ERROR_MESSAGES.INTERNAL_SERVER_ERROR));
};
