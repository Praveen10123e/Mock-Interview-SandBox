import { Request, Response, NextFunction } from 'express';
import { BaseController } from '@nm/api-base';
import { ErrorFactory } from '@nm/errors';
import { AdminUserService } from '../services/AdminUserService';

export class AdminUserController extends BaseController {
  private adminUserService: AdminUserService;

  constructor() {
    super();
    this.adminUserService = new AdminUserService();
  }

  /**
   * First-pass gateway check — accepts ADMINISTRATOR or SUPER_ADMIN (in x-user-role header).
   * Rejects FACULTY and STUDENT immediately.
   * NOTE: This is NOT the authoritative security check. The service layer performs
   * DB-backed role lookups for the authoritative decision.
   */
  private checkAdminAuth(req: Request): void {
    const roleHeader = (req.headers['x-user-role'] as string) || '';
    const roles = roleHeader.split(',').map((r) => r.trim().toUpperCase());
    if (
      !roles.includes('ADMINISTRATOR') &&
      !roles.includes('ADMIN') &&
      !roles.includes('SUPER_ADMIN')
    ) {
      throw ErrorFactory.unauthorized('Forbidden: Administrator or Super Admin privileges required');
    }
  }

  private forbidden(res: Response, message: string): Response {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message },
    });
  }

  /**
   * GET /api/v1/users/admin/users/overview
   */
  public getOverview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      this.checkAdminAuth(req);
      const overview = await this.adminUserService.getUsersOverview();
      return (this as any).sendSuccess(res, overview, 'Admin users overview retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/users/admin/users
   */
  public listUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      this.checkAdminAuth(req);
      const params = {
        search: req.query.search as string | undefined,
        role: req.query.role as string | undefined,
        status: req.query.status as string | undefined,
        department: req.query.department as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await this.adminUserService.listUsers(params);
      return (this as any).sendSuccess(res, result, 'Users listed successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/users/admin/users/:id
   */
  public getUserDetail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      this.checkAdminAuth(req);
      const { id } = req.params;
      if (!id) {
        throw ErrorFactory.validation('User ID is required');
      }
      const userDetail = await this.adminUserService.getUserDetail(String(id));
      return (this as any).sendSuccess(res, userDetail, 'User details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/users/admin/users/:id/profile
   * actorIdentityId is passed to the service for DB-backed permission check.
   */
  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      this.checkAdminAuth(req);
      const { id } = req.params;
      const actorIdentityId = req.headers['x-identity-id'] as string | undefined;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'User ID is required' },
        });
      }

      const updated = await this.adminUserService.updateUserProfile(String(id), req.body, actorIdentityId);
      return (this as any).sendSuccess(res, updated, 'User profile updated successfully');
    } catch (error: any) {
      if (error?.statusCode === 403 || error?.code === 'FORBIDDEN') {
        return this.forbidden(res, error.message);
      }
      next(error);
    }
  };

  /**
   * PATCH /api/v1/users/admin/users/:id/status
   * actorIdentityId is passed to the service for DB-backed permission check.
   * The service is the authoritative security boundary for SUPER_ADMIN protection.
   */
  public updateStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      this.checkAdminAuth(req);
      const { id } = req.params;
      const { status } = req.body;
      const actorIdentityId = req.headers['x-identity-id'] as string | undefined;

      if (!id || !status) {
        return res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'User ID and target status are required' },
        });
      }

      // Controller-level self-protection (early exit optimization)
      // Service-level DB check is the authoritative guard
      if (actorIdentityId && actorIdentityId === id && status.toUpperCase() !== 'ACTIVE') {
        return this.forbidden(
          res,
          'Self-protection: You cannot deactivate, lock, or ban your own currently authenticated account.'
        );
      }

      const result = await this.adminUserService.updateUserStatus(String(id), status, actorIdentityId);
      return (this as any).sendSuccess(res, result, result.message);
    } catch (error: any) {
      if (error?.statusCode === 403 || error?.code === 'FORBIDDEN') {
        return this.forbidden(res, error.message);
      }
      next(error);
    }
  };

  /**
   * POST /api/v1/users/admin/users
   * Create Student or Faculty account from Admin Panel
   */
  public createUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      this.checkAdminAuth(req);
      const actorIdentityId = req.headers['x-identity-id'] as string;
      if (!actorIdentityId) {
        return this.forbidden(res, 'Authentication required');
      }

      const result = await this.adminUserService.createUser(actorIdentityId, req.body);
      return (this as any).sendCreated(res, result, result.message);
    } catch (error: any) {
      if (error?.statusCode === 403 || error?.code === 'FORBIDDEN') {
        return this.forbidden(res, error.message);
      }
      next(error);
    }
  };

  /**
   * POST /api/v1/users/admin/users/:id/reset-password
   */
  public resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      this.checkAdminAuth(req);
      const { id } = req.params;
      const { password } = req.body;
      const actorIdentityId = req.headers['x-identity-id'] as string;
      if (!actorIdentityId || !id) {
        return this.forbidden(res, 'Authentication required');
      }

      const result = await this.adminUserService.resetUserPassword(actorIdentityId, String(id), password);
      return (this as any).sendSuccess(res, result, result.message);
    } catch (error: any) {
      if (error?.statusCode === 403 || error?.code === 'FORBIDDEN') {
        return this.forbidden(res, error.message);
      }
      next(error);
    }
  };
}
