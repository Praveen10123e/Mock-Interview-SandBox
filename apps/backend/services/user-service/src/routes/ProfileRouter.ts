import { BaseRouter } from '@nm/api-base';
import { ProfileController } from '../controllers/ProfileController';
import { ResumeController } from '../controllers/ResumeController';
import { FacultyController } from '../controllers/FacultyController';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export class ProfileRouter extends BaseRouter {
  private profileController!: ProfileController;
  private resumeController!: ResumeController;
  private facultyController!: FacultyController;

  constructor() {
    super();
  }

  protected initializeRoutes(): void {
    this.profileController = new ProfileController();
    this.resumeController = new ResumeController();
    this.facultyController = new FacultyController();
    
    // Faculty Dashboard Overview
    this.router.get('/faculty/dashboard', this.facultyController.getDashboard as any);

    // Base Profile
    this.router.get('/', this.profileController.getProfile as any); // Uses headers
    this.router.post('/', this.profileController.createProfile as any);
    this.router.get('/stats', this.profileController.getStats as any);
    this.router.patch('/preferences', this.profileController.updatePreferences as any);
    this.router.get('/me/completion', this.profileController.getCompletionStatus as any);
    this.router.get('/:identityId', this.profileController.getProfile as any);
    this.router.put('/', this.profileController.updateBaseProfile as any);

    // Education, Skills, Resumes, etc. would be wired here to their respective controllers
    this.router.post(
      '/me/resume',
      upload.single('resume') as any,
      this.resumeController.uploadResume as any
    );
    this.router.get('/me/resume', this.resumeController.getActiveResume as any);
    this.router.delete('/me/resume/:resumeId', this.resumeController.deleteResume as any);
  }
}
