import { Request, Response, NextFunction } from 'express';
import { BaseController } from '@nm/api-base';
import { ErrorFactory } from '@nm/errors';
import { FacultyService } from '../services/FacultyService';

export class FacultyController extends BaseController {
  private facultyService: FacultyService;

  constructor() {
    super();
    this.facultyService = new FacultyService();
  }

  public getDashboard = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      if (!identityId) {
        throw ErrorFactory.unauthenticated('Authentication required');
      }

      const roleHeader = (req.headers['x-user-role'] as string) || '';
      const roles = roleHeader.split(',').map((r) => r.trim());
      if (!roles.includes('FACULTY') && !roles.includes('ADMINISTRATOR')) {
        throw ErrorFactory.unauthorized('Forbidden: Faculty access required');
      }

      const dashboardData = await this.facultyService.getFacultyDashboard(identityId);
      return (this as any).sendSuccess(res, dashboardData, 'Faculty dashboard loaded successfully');
    } catch (error) {
      next(error);
    }
  };

  public getStudents = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      if (!identityId) {
        throw ErrorFactory.unauthenticated('Authentication required');
      }

      const roleHeader = (req.headers['x-user-role'] as string) || '';
      const roles = roleHeader.split(',').map((r) => r.trim());
      if (!roles.includes('FACULTY') && !roles.includes('ADMINISTRATOR')) {
        throw ErrorFactory.unauthorized('Forbidden: Faculty access required');
      }

      const filters = {
        search: req.query.search as string | undefined,
        department: req.query.department as string | undefined,
        batch: req.query.batch as string | undefined,
        status: req.query.status as string | undefined,
      };

      const result = await this.facultyService.getStudents(identityId, filters);
      return (this as any).sendSuccess(res, result, 'Students loaded successfully');
    } catch (error) {
      next(error);
    }
  };

  public getStudentDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      if (!identityId) {
        throw ErrorFactory.unauthenticated('Authentication required');
      }

      const roleHeader = (req.headers['x-user-role'] as string) || '';
      const roles = roleHeader.split(',').map((r) => r.trim());
      if (!roles.includes('FACULTY') && !roles.includes('ADMINISTRATOR')) {
        throw ErrorFactory.unauthorized('Forbidden: Faculty access required');
      }

      const studentId = (req.params.studentId as string) || '';
      if (!studentId) {
        throw ErrorFactory.validation('Student ID is required');
      }

      const result = await this.facultyService.getStudentDetail(identityId, studentId);
      return (this as any).sendSuccess(res, result, 'Student detail loaded successfully');
    } catch (error) {
      next(error);
    }
  };

  public getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      if (!identityId) {
        throw ErrorFactory.unauthenticated('Authentication required');
      }

      const roleHeader = (req.headers['x-user-role'] as string) || '';
      const roles = roleHeader.split(',').map((r) => r.trim());
      if (!roles.includes('FACULTY') && !roles.includes('ADMINISTRATOR')) {
        throw ErrorFactory.unauthorized('Forbidden: Faculty access required');
      }

      const result = await this.facultyService.getFacultyProfile(identityId);
      return (this as any).sendSuccess(res, result, 'Faculty profile loaded successfully');
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      if (!identityId) {
        throw ErrorFactory.unauthenticated('Authentication required');
      }

      const roleHeader = (req.headers['x-user-role'] as string) || '';
      const roles = roleHeader.split(',').map((r) => r.trim());
      if (!roles.includes('FACULTY') && !roles.includes('ADMINISTRATOR')) {
        throw ErrorFactory.unauthorized('Forbidden: Faculty access required');
      }

      const result = await this.facultyService.updateFacultyProfile(identityId, req.body);
      return (this as any).sendSuccess(res, result, 'Faculty profile updated successfully');
    } catch (error) {
      next(error);
    }
  };
}
