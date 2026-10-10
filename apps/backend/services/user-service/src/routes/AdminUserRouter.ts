import { BaseRouter } from '@nm/api-base';
import { AdminUserController } from '../controllers/AdminUserController';

export class AdminUserRouter extends BaseRouter {
  private adminUserController!: AdminUserController;

  constructor() {
    super();
  }

  protected initializeRoutes(): void {
    this.adminUserController = new AdminUserController();

    this.router.get('/overview', this.adminUserController.getOverview as any);
    this.router.get('/', this.adminUserController.listUsers as any);
    this.router.post('/', this.adminUserController.createUser as any);
    this.router.get('/:id', this.adminUserController.getUserDetail as any);
    this.router.patch('/:id/profile', this.adminUserController.updateProfile as any);
    this.router.patch('/:id/status', this.adminUserController.updateStatus as any);
    this.router.post('/:id/reset-password', this.adminUserController.resetPassword as any);
  }
}
