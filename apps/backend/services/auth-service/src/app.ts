import { BaseApplication } from '@nm/api-base';
import { AuthRouter } from './routes/AuthRouter';

export class Application extends BaseApplication {
  constructor() {
    super('auth-service', '1.0.0');
  }

  protected initializeRoutes(): void {
    this.addRouter('/', new AuthRouter());
  }
}
