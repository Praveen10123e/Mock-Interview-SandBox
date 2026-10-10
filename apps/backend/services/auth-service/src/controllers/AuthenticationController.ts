import { Request, Response, NextFunction } from 'express';
import { BaseController } from '@nm/api-base';
import { AuthenticationService } from '../services/AuthenticationService';
import { SessionService } from '../services/SessionService';
import { TokenService } from '../services/TokenService';

export class AuthenticationController extends BaseController {
  private authService: AuthenticationService;
  private sessionService: SessionService;
  private tokenService: TokenService;

  constructor() {
    super();
    this.authService = new AuthenticationService();
    this.sessionService = new SessionService();
    this.tokenService = new TokenService();
  }

  public login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const { email, password } = req.body;

      if (!email || !password || typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'ValidationError', message: 'Email and password are required' }
        });
      }

      const identity = (await this.authService.verifyCredentials(email, password)) as any;

      // Create session
      const { session, refreshTokenString } = await this.sessionService.createSession(
        identity.id,
        req.ip,
        req.headers['user-agent'],
      );

      // Extract roles
      const roles = identity.roles.map((ir: any) => ir.role.name);

      // Generate JWT
      const accessToken = this.tokenService.generateAccessToken({
        sub: identity.id,
        email: identity.email,
        roles,
        permissions: [], // would extract from roles in full implementation
        sessionId: session.id,
      });

      // Set HttpOnly cookie for refresh token
      res.cookie('refresh_token', refreshTokenString, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return (this as any).sendSuccess(
        res,
        { accessToken, user: { id: identity.id, email: identity.email, roles } },
        'Login successful',
      );
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const { sessionId } = req.body; // or decoded from JWT in real middleware
      if (sessionId) {
        await this.sessionService.revokeSession(sessionId);
      }
      res.clearCookie('refresh_token');
      return (this as any).sendSuccess(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  };

  public changePassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const identityId = (req.headers['x-identity-id'] as string) || (req as any).user?.sub;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      const result = await this.authService.changePassword(
        identityId,
        currentPassword,
        newPassword,
        confirmPassword
      );

      return (this as any).sendSuccess(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  };

  public deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const identityId = (req.headers['x-identity-id'] as string) || (req as any).user?.sub;

      const result = await this.authService.deleteAccount(identityId);
      res.clearCookie('refresh_token');

      return (this as any).sendSuccess(res, result, 'Account deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public sendPasswordResetOtp = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const { email } = req.body;
      const result = await this.authService.sendPasswordResetOtp(email);
      return (this as any).sendSuccess(res, result, 'OTP sent successfully');
    } catch (error) {
      next(error);
    }
  };

  public verifyPasswordResetOtp = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const { email, otp } = req.body;
      const result = await this.authService.verifyPasswordResetOtp(email, otp);
      return (this as any).sendSuccess(res, result, 'OTP verified successfully');
    } catch (error) {
      next(error);
    }
  };

  public resetPasswordWithToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const { resetToken, newPassword, confirmPassword } = req.body;
      const result = await this.authService.resetPasswordWithToken(resetToken, newPassword, confirmPassword);
      return (this as any).sendSuccess(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  };
}
