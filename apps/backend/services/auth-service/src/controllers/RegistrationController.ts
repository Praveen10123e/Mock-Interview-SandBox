import { Request, Response, NextFunction } from 'express';
import { BaseController } from '@nm/api-base';
import { ErrorFactory } from '@nm/errors';
import { RegistrationService } from '../services/RegistrationService';

export class RegistrationController extends BaseController {
  private registrationService: RegistrationService;

  constructor() {
    super();
    this.registrationService = new RegistrationService();
  }

  private checkAdminPermission(req: Request): void {
    const roleHeader = (req.headers['x-user-role'] as string) || '';
    const roles = roleHeader.split(',').map((r) => r.trim().toUpperCase());
    if (
      !roles.includes('ADMINISTRATOR') &&
      !roles.includes('ADMIN') &&
      !roles.includes('SUPER_ADMIN')
    ) {
      throw ErrorFactory.unauthorized(
        'Forbidden: Administrator privileges required to create Faculty or Administrator accounts'
      );
    }
  }

  public registerPublic = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const { email, password, firstName, lastName, fullName, name } = req.body;
      // ALWAYS force role to STUDENT — client-supplied roles are strictly ignored
      const identity = await this.registrationService.register(
        email,
        password,
        'STUDENT',
        firstName,
        lastName,
        fullName || name
      );
      return (this as any).sendCreated(
        res,
        { id: identity.id, email: identity.email, role: 'STUDENT' },
        'Account registered successfully',
      );
    } catch (error) {
      next(error);
    }
  };

  public registerStudent = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    return this.registerPublic(req, res, next);
  };

  public registerFaculty = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      this.checkAdminPermission(req);
      const { email, password, firstName, lastName, fullName, name } = req.body;
      const identity = await this.registrationService.register(
        email,
        password,
        'FACULTY',
        firstName,
        lastName,
        fullName || name
      );
      return (this as any).sendCreated(
        res,
        { id: identity.id, email: identity.email, role: 'FACULTY' },
        'Faculty registered successfully',
      );
    } catch (error: any) {
      if (error?.statusCode === 403 || error?.code === 'FORBIDDEN') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: error.message },
        });
      }
      next(error);
    }
  };

  public registerAdmin = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      this.checkAdminPermission(req);
      const { email, password, firstName, lastName, fullName, name } = req.body;
      const identity = await this.registrationService.register(
        email,
        password,
        'ADMINISTRATOR',
        firstName,
        lastName,
        fullName || name
      );
      return (this as any).sendCreated(
        res,
        { id: identity.id, email: identity.email, role: 'ADMINISTRATOR' },
        'Admin registered successfully',
      );
    } catch (error: any) {
      if (error?.statusCode === 403 || error?.code === 'FORBIDDEN') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: error.message },
        });
      }
      next(error);
    }
  };
}
