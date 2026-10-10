import { Request, Response } from 'express';
import { BaseController } from './BaseController';

export class BaseHealthController extends BaseController {
  constructor(
    private serviceName: string,
    private version: string,
  ) {
    super();
  }

  public health = (req: Request, res: Response) => {
    return this.sendSuccess(res, {
      status: 'OK',
      service: this.serviceName,
      timestamp: Date.now(),
    });
  };

  public ready = (req: Request, res: Response) => {
    return this.sendSuccess(res, { status: 'READY', service: this.serviceName });
  };

  public live = (req: Request, res: Response) => {
    return this.sendSuccess(res, { status: 'LIVE', service: this.serviceName });
  };

  public versionInfo = (req: Request, res: Response) => {
    return this.sendSuccess(res, { service: this.serviceName, version: this.version });
  };

  public metrics = (req: Request, res: Response) => {
    return this.sendSuccess(res, { uptime: process.uptime(), memory: process.memoryUsage() });
  };

  public info = (req: Request, res: Response) => {
    return this.sendSuccess(res, {
      name: this.serviceName,
      version: this.version,
      env: process.env.NODE_ENV,
    });
  };
}
