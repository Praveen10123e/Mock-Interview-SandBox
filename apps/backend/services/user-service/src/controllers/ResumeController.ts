import { Request, Response, NextFunction } from 'express';
import { BaseController } from '@nm/api-base';
import { ErrorFactory } from '@nm/errors';
import { StorageFactory } from '../providers/StorageFactory';
import { PrismaClient } from '../generated/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class ResumeController extends BaseController {
  private storageProvider = StorageFactory.getProvider();

  public uploadResume = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      if (!identityId) throw ErrorFactory.unauthorized('Unauthorized');

      const file = req.file;
      if (!file) {
        throw ErrorFactory.validation('No file uploaded');
      }

      // Check file size (e.g., 5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw ErrorFactory.validation('File size exceeds 5MB limit');
      }

      // Allow PDF only for resumes
      if (file.mimetype !== 'application/pdf') {
        throw ErrorFactory.validation('Only PDF files are allowed');
      }

      const profile = await prisma.profile.findUnique({
        where: { identityId },
        select: { id: true },
      });

      if (!profile) {
        throw ErrorFactory.notFound('Profile not found');
      }

      // Deactivate older resumes
      await prisma.resume.updateMany({
        where: { profileId: profile.id, isActive: true },
        data: { isActive: false },
      });

      const fileId = uuidv4();
      const extension = file.originalname.split('.').pop() || 'pdf';
      const key = `resumes/${profile.id}/${fileId}.${extension}`;

      await this.storageProvider.upload(file, key);

      const resume = await prisma.resume.create({
        data: {
          id: fileId,
          profileId: profile.id,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          storageProvider: process.env.STORAGE_PROVIDER || 'local',
          storageKey: key,
          isActive: true,
          parsingStatus: 'PENDING',
        }
      });

      return (this as any).sendSuccess(res, resume, 'Resume uploaded successfully');
    } catch (error) {
      next(error);
    }
  };

  public getActiveResume = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      if (!identityId) throw ErrorFactory.unauthorized('Unauthorized');

      const profile = await prisma.profile.findUnique({
        where: { identityId },
        include: {
          resumes: {
            where: { isActive: true },
            take: 1,
          }
        }
      });

      if (!profile || profile.resumes.length === 0) {
        throw ErrorFactory.notFound('Active resume not found');
      }

      const resume = profile.resumes[0];
      const url = await this.storageProvider.getSignedUrl(resume.storageKey);

      return (this as any).sendSuccess(res, { ...resume, url }, 'Resume retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public deleteResume = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const identityId = req.headers['x-identity-id'] as string;
      const resumeId = req.params.resumeId as string;
      
      if (!identityId) throw ErrorFactory.unauthorized('Unauthorized');

      const profile = await prisma.profile.findUnique({ where: { identityId } });
      if (!profile) throw ErrorFactory.notFound('Profile not found');

      const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
      if (!resume || resume.profileId !== profile.id) {
        throw ErrorFactory.notFound('Resume not found');
      }

      await this.storageProvider.delete(resume.storageKey);
      await prisma.resume.delete({ where: { id: resumeId } });

      return (this as any).sendSuccess(res, null, 'Resume deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}
