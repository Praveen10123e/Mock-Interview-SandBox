import { BaseApplication } from '@nm/api-base';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';
import { ServiceRegistry } from './config/registry';
import { authPlaceholder, authzPlaceholder } from './middleware/auth';
import { GatewayRoutes } from './routes/GatewayRoutes';
import { buildOpenAPISpec } from './swagger/OpenAPISpec';

export class GatewayApplication extends BaseApplication {
  constructor() {
    super('API-Gateway', '1.0.0');
  }

  protected initializeRoutes(): void {
    // ── Swagger / OpenAPI Documentation Portal ───────────────────────────────
    // Mounted FIRST so it is never caught by the proxy or 404 handler.
    // GET /docs → Interactive Swagger UI
    // GET /docs/openapi.json → Raw OpenAPI 3.0.3 spec
    const spec = buildOpenAPISpec();

    this.app.get('/docs/openapi.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.json(spec);
    });

    this.app.use(
      '/docs',
      swaggerUi.serve as any,
      swaggerUi.setup(spec, {
        customSiteTitle: 'NM Mock Interview — API Docs',
        customCss: `
          .swagger-ui .topbar { background-color: #0f172a; }
          .swagger-ui .topbar .download-url-wrapper { display: none; }
          .swagger-ui .info .title { color: #6366f1; }
          .swagger-ui .btn.authorize { background-color: #6366f1; border-color: #6366f1; color: #fff; }
          .swagger-ui .btn.authorize svg { fill: #fff; }
        `,
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          tryItOutEnabled: true,
          defaultModelsExpandDepth: 0,
        },
      }) as any,
    );

    // ── Phase 1-4: Gateway Developer Portal ─────────────────────────────────
    // GET /           → Gateway landing page
    // GET /gateway    → Gateway diagnostics
    // GET /services   → Live service health probes
    // GET /api        → API discovery
    this.addRouter('/', new GatewayRoutes());

    // ── Rate Limiting ────────────────────────────────────────────────────────
    
    // Auth endpoints (strict limit to prevent brute force)
    this.app.use('/api/v1/auth', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP/User to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      validate: false,
      keyGenerator: (req: any) => req.headers['x-identity-id'] || req.ip || 'unknown',
      handler: (_req, res) => {
        res.status(429).json({
          success: false,
          errorType: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts. Please wait before trying again.',
          retryAfter: 900
        });
      }
    }) as any);

    // Judge / Execution endpoints
    this.app.use('/api/v1/judge', rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 15, // limit each IP/User to 15 execution requests per minute
      standardHeaders: true,
      legacyHeaders: false,
      validate: false,
      keyGenerator: (req: any) => req.headers['x-identity-id'] || req.ip || 'unknown',
      handler: (_req, res) => {
        res.status(429).json({
          success: false,
          errorType: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many execution requests. Please wait before trying again.',
          retryAfter: 60
        });
      }
    }) as any);

    // General API Limit
    this.app.use('/api/v1', rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // limit each IP/User to 100 requests per minute
      standardHeaders: true,
      legacyHeaders: false,
      validate: false,
      keyGenerator: (req: any) => req.headers['x-identity-id'] || req.ip || 'unknown',
      handler: (_req, res) => {
        res.status(429).json({
          success: false,
          errorType: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please wait before trying again.',
          retryAfter: 60
        });
      }
    }) as any);

    // ── Existing: Apply global auth middleware for all /api/v1 routes ────────
    this.app.use('/api/v1', authPlaceholder as any, authzPlaceholder as any);

    // ── Existing: Register proxy routes for all active services ──────────────
    const envUrlMap: Record<string, string | undefined> = {
      auth: process.env.AUTH_SERVICE_URL,
      users: process.env.USER_SERVICE_URL,
      interviews: process.env.INTERVIEW_SERVICE_URL,
      questions: process.env.QUESTION_BANK_SERVICE_URL,
      judge: process.env.JUDGE_SERVICE_URL,
      templates: process.env.INTERVIEW_SERVICE_URL,
      admin: process.env.INTERVIEW_SERVICE_URL,
    };

    for (const [key, service] of Object.entries(ServiceRegistry)) {
      if (service.status === 'active') {
        const envUrl = envUrlMap[key]?.trim();
        const rawTargetUrl =
          envUrl && envUrl.length > 0
            ? envUrl
            : service.url && service.url.trim().length > 0
              ? service.url.trim()
              : `http://${service.host}:${service.port}`;
        const targetUrl = rawTargetUrl.replace(/\/+$/, '');

        this.logger.info(`[Gateway] Proxy target: ${key} -> ${targetUrl}`);

        this.app.use(
          `/api/v1/${key}`,
          createProxyMiddleware({
            target: targetUrl,
            changeOrigin: true,
            pathRewrite: (path: string) => {
              if (key === 'templates') {
                const subPath = path.startsWith('/') ? path : `/${path}`;
                return subPath === '/' ? '/templates' : `/templates${subPath}`;
              }
              if (key === 'admin') {
                const subPath = path.startsWith('/') ? path : `/${path}`;
                return subPath === '/' ? '/admin' : `/admin${subPath}`;
              }
              return path;
            },
            on: {
              proxyReq: (proxyReq: any, req: any, _res: any) => {
                if (req.headers['x-request-id']) {
                  proxyReq.setHeader('x-request-id', req.headers['x-request-id']);
                }
                if (req.headers['x-identity-id']) {
                  proxyReq.setHeader('x-identity-id', req.headers['x-identity-id']);
                }
                if (req.headers['x-user-role']) {
                  proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
                }
                if (req.headers['x-user-email']) {
                  proxyReq.setHeader('x-user-email', req.headers['x-user-email']);
                }
                fixRequestBody(proxyReq, req);
              },
              error: (err: any, _req: any, res: any) => {
                this.logger.error({ err, target: targetUrl }, 'Proxy Error');
                res.status(502).json({
                  success: false,
                  error: {
                    code: 'BAD_GATEWAY',
                    message: `Service ${key} is currently unavailable.`,
                  },
                });
              },
            },
          }),
        );
      }
    }

    // ── Enhanced 404 catch-all ──────────────────────────────────────────────
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `The requested API endpoint '${req.originalUrl}' does not exist.`,
          suggestion: "Visit '/' for gateway information, '/docs' for Swagger UI, or '/api' for the API directory.",
        },
      });
    });
  }
}
