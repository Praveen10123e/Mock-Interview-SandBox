import { BaseRouter } from '@nm/api-base';
import { GatewayController } from '../controllers/GatewayController';

/**
 * GatewayRoutes — mounts all gateway developer portal endpoints.
 *
 * Extends BaseRouter to comply with the existing addRouter() pattern in BaseApplication.
 * Registered BEFORE the /api/v1 proxy middleware in app.ts so these routes
 * are never accidentally forwarded to a microservice.
 *
 * Routes:
 *   GET /           → Gateway landing page
 *   GET /gateway    → Gateway diagnostics (memory, uptime, runtime)
 *   GET /services   → Live health probes for all registered services
 *   GET /api        → API discovery — all public endpoints grouped by service
 */
export class GatewayRoutes extends BaseRouter {
  private controller!: GatewayController;

  protected initializeRoutes(): void {
    // Controller is instantiated here (inside initializeRoutes) because
    // BaseRouter's constructor calls initializeRoutes() before any subclass
    // field assignments run — matching the AuthRouter pattern.
    this.controller = new GatewayController();

    this.router.get('/', this.controller.getRoot as any);
    this.router.get('/gateway', this.controller.getGateway as any);
    this.router.get('/services', this.controller.getServices as any);
    this.router.get('/api', this.controller.getApiDiscovery as any);
  }
}
