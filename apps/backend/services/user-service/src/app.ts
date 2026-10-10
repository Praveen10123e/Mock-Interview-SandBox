import { BaseApplication } from '@nm/api-base';
import { ProfileRouter } from './routes/ProfileRouter';
import { FacultyRouter } from './routes/FacultyRouter';
import { AdminUserRouter } from './routes/AdminUserRouter';

export class Application extends BaseApplication {
  constructor() {
    super('user-service', '1.0.0');
  }

  protected initializeRoutes(): void {
    this.addRouter('/profile', new ProfileRouter());
    this.addRouter('/faculty', new FacultyRouter());
    this.addRouter('/admin/users', new AdminUserRouter());
  }
}
