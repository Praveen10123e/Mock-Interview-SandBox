import { LoggerFactory } from '@nm/logger';

const logger = LoggerFactory.getLogger('Metrics');

export class MetricsTimer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
  }

  stop() {
    const duration = performance.now() - this.startTime;
    logger.info({ operation: this.operation, durationMs: duration }, 'MetricsTimer');
    return duration;
  }
}
