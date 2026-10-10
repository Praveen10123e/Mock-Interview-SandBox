import { Request, Response } from 'express';
import { ResponseBuilder } from '@nm/shared';

export class HealthController {
  static check(req: Request, res: Response) {
    const healthcheck = {
      uptime: process.uptime(),
      message: 'OK',
      timestamp: Date.now(),
    };

    return res.status(200).json(ResponseBuilder.success(healthcheck));
  }
}
