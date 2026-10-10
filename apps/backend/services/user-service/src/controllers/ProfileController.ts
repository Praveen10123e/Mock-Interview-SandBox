import { Request, Response, NextFunction } from 'express';
import { BaseController } from '@nm/api-base';
import { ErrorFactory } from '@nm/errors';
import { ProfileService } from '../services/ProfileService';

export class ProfileController extends BaseController {
  private profileService: ProfileService;

  constructor() {
    super();
    this.profileService = new ProfileService();
  }

  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const identityId =
        (req.params.identityId as string) || (req.headers['x-identity-id'] as string);
      if (!identityId) throw ErrorFactory.unauthorized('Unauthorized');

      const userEmail =
        (req.headers['x-user-email'] as string) || (req.query.email as string);

      const profile = await this.profileService.getProfileByIdentityId(identityId, userEmail);
      return (this as any).sendSuccess(res, profile, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public createProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const { identityId, firstName, lastName, email } = req.body;
      if (!identityId) throw ErrorFactory.validation('identityId is required');

      const profile = await this.profileService.createProfile({
        identityId,
        firstName,
        lastName,
        email,
      });
      return (this as any).sendCreated(res, profile, 'Profile created successfully');
    } catch (error) {
      next(error);
    }
  };

  public updateBaseProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      if (!identityId) throw ErrorFactory.unauthorized('Unauthorized');

      const updated = await this.profileService.updateProfileBase(identityId, req.body);
      return (this as any).sendSuccess(res, updated, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getCompletionStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      if (!identityId) throw ErrorFactory.unauthorized('Unauthorized');

      const status = await this.profileService.getCompletionStatus(identityId);
      return (this as any).sendSuccess(res, status, 'Completion status retrieved');
    } catch (error) {
      next(error);
    }
  };

  public updatePreferences = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      if (!identityId) throw ErrorFactory.unauthorized('Unauthorized');

      const updated = await this.profileService.updatePreferences(identityId, req.body);
      return (this as any).sendSuccess(res, updated, 'Preferences updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getStats = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      if (!identityId) throw ErrorFactory.unauthorized('Unauthorized');

      const stats = await this.profileService.getCodingStats(identityId);
      return (this as any).sendSuccess(res, stats, 'Coding stats retrieved');
    } catch (error) {
      next(error);
    }
  };
}
