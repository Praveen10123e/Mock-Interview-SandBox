import { BaseRouter } from '@nm/api-base';
import { AuthenticationController } from '../controllers/AuthenticationController';
import { RegistrationController } from '../controllers/RegistrationController';

export class AuthRouter extends BaseRouter {
  private authController!: AuthenticationController;
  private regController!: RegistrationController;

  constructor() {
    super();
  }

  protected initializeRoutes(): void {
    this.authController = new AuthenticationController();
    this.regController = new RegistrationController();

    // Registration
    this.router.post('/register', this.regController.registerPublic as any);
    this.router.post('/register/student', this.regController.registerStudent as any);
    this.router.post('/register/faculty', this.regController.registerFaculty as any);
    this.router.post('/register/admin', this.regController.registerAdmin as any);

    // Authentication
    this.router.post('/login', this.authController.login as any);
    this.router.post('/logout', this.authController.logout as any);
    this.router.post('/change-password', this.authController.changePassword as any);
    this.router.delete('/account', this.authController.deleteAccount as any);

    // Password Reset / Recovery Flow
    this.router.post('/forgot-password/send-otp', this.authController.sendPasswordResetOtp as any);
    this.router.post('/forgot-password/verify-otp', this.authController.verifyPasswordResetOtp as any);
    this.router.post('/forgot-password/reset-password', this.authController.resetPasswordWithToken as any);
  }
}
