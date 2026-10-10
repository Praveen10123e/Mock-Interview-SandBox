import { LoggerFactory } from '@nm/logger';
import { Logger } from 'pino';

export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(serviceName: string) {
    this.logger = LoggerFactory.getLogger(serviceName);
  }
}
