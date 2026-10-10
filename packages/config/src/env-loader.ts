import dotenv from 'dotenv';
import path from 'path';
import { envSchema, EnvConfig } from './schema';

export class EnvLoader {
  private static config: EnvConfig;

  static load(): EnvConfig {
    if (this.config) {
      return this.config;
    }

    const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

    dotenv.config({ path: path.resolve(process.cwd(), envFile) });

    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
      console.error('❌ Invalid environment variables:', parsed.error.format());
      process.exit(1);
    }

    this.config = parsed.data;
    return this.config;
  }

  static getConfig(): EnvConfig {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }
}
