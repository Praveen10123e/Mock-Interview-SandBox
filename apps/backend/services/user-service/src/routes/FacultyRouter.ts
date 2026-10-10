import { BaseRouter } from '@nm/api-base';
import { FacultyController } from '../controllers/FacultyController';

export class FacultyRouter extends BaseRouter {
  private facultyController!: FacultyController;

  constructor() {
    super();
  }

  protected initializeRoutes(): void {
    this.facultyController = new FacultyController();
    this.router.get('/dashboard', this.facultyController.getDashboard as any);
    this.router.get('/students', this.facultyController.getStudents as any);
    this.router.get('/students/:studentId', this.facultyController.getStudentDetail as any);
    this.router.get('/profile', this.facultyController.getProfile as any);
    this.router.put('/profile', this.facultyController.updateProfile as any);
  }
}
