import express, { Application, Request, Response, NextFunction } from 'express';
import { BaseRouter } from './BaseRouter';
import { BaseHealthController } from './BaseHealthController';
import { EnvLoader } from '@nm/config';
import { LoggerFactory } from '@nm/logger';
import { errorHandler, requestLogger, securityMiddleware } from '@nm/middleware';
import { Logger } from 'pino';

export abstract class BaseApplication {
  public app: Application;
  public logger: Logger;
  protected serviceName: string;
  protected version: string;

  constructor(serviceName: string, version: string = '1.0.0') {
    this.app = express();
    this.serviceName = serviceName;
    this.version = version;
    this.logger = LoggerFactory.getLogger(serviceName);

    this.initializeConfig();
    this.initializeMiddlewares();
    this.initializeHealthCheck();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  protected initializeConfig(): void {
    EnvLoader.load();
  }

  protected initializeMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Security middlewares
    securityMiddleware.forEach((mw: any) => this.app.use(mw));

    // Logging
    this.app.use(requestLogger);

    // Placeholder for global auth/authz if needed at base level
    // this.app.use(this.authenticationPlaceholder);
  }

  protected initializeHealthCheck(): void {
    const healthController = new BaseHealthController(this.serviceName, this.version);

    this.app.get('/health', healthController.health);
    this.app.get('/ready', healthController.ready);
    this.app.get('/live', healthController.live);
    this.app.get('/version', healthController.versionInfo);
    this.app.get('/metrics', healthController.metrics);
    this.app.get('/info', healthController.info);
  }

  protected abstract initializeRoutes(): void;

  protected addRouter(path: string, router: BaseRouter): void {
    this.app.use(path, router.router);
  }

  protected initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(): void {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () => {
      this.logger.info(`=================================`);
      this.logger.info(`🚀 ${this.serviceName} listening on port ${port}`);
      this.logger.info(`=================================`);
    });
  }
}
