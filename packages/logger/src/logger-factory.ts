import pino, { Logger } from 'pino';

export class LoggerFactory {
  private static instance: Logger;

  static getLogger(serviceName: string = 'app'): Logger {
    if (!this.instance) {
      const isProduction = process.env.NODE_ENV === 'production';
      const level = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

      this.instance = pino({
        level,
        ...(isProduction
          ? {
              formatters: {
                level: (label) => {
                  return { level: label.toUpperCase() };
                },
              },
              timestamp: pino.stdTimeFunctions.isoTime,
            }
          : {
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              },
            }),
      });
    }

    return this.instance.child({ service: serviceName });
  }
}
