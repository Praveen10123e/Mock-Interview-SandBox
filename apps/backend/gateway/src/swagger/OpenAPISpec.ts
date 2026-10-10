/**
 * OpenAPISpec — Generates a complete OpenAPI 3.0.3 specification at runtime
 * from GatewayManifest (the single source of truth).
 *
 * No routes, services, or descriptions are duplicated here.
 * All data flows from GatewayManifest → OpenAPI paths/tags/schemas.
 */

import { GatewayManifest, ApiEndpoint } from '../manifest/GatewayManifest';

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface OpenAPISpec {
  openapi: string;
  info: object;
  servers: object[];
  tags: object[];
  components: object;
  paths: Record<string, any>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converts Express-style path params (:id) to OpenAPI style ({id}).
 * e.g. /api/v1/interviews/:id/start → /api/v1/interviews/{id}/start
 */
function toOpenAPIPath(expressPath: string): string {
  return expressPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
}

/**
 * Extracts path parameter names from an Express path.
 * e.g. /api/v1/interviews/:id/execute → ['id']
 */
function extractPathParams(expressPath: string): string[] {
  const matches = expressPath.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

/**
 * Builds the OpenAPI parameter objects for path params.
 */
function buildPathParameters(paramNames: string[]): object[] {
  return paramNames.map((name) => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
    description: `The ${name} identifier`,
    example: name === 'id' ? 'clx1234abcd5678efgh' : `${name}_example`,
  }));
}

/**
 * Returns realistic request body examples per endpoint path + method.
 */
function buildRequestBody(endpoint: ApiEndpoint): object | undefined {
  const path = endpoint.path;
  const method = endpoint.method;

  if (method === 'GET' || method === 'DELETE') return undefined;

  const examples: Record<string, object> = {
    '/api/v1/auth/login': {
      email: 'student@example.com',
      password: 'password123',
    },
    '/api/v1/auth/register/student': {
      email: 'student@example.com',
      password: 'password123',
      firstName: 'Arjun',
      lastName: 'Kumar',
      institution: 'Anna University',
    },
    '/api/v1/auth/register/faculty': {
      email: 'faculty@example.com',
      password: 'password123',
      firstName: 'Dr. Priya',
      lastName: 'Sharma',
      department: 'Computer Science',
      employeeId: 'FAC-2024-001',
    },
    '/api/v1/auth/register/admin': {
      email: 'admin@example.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      adminCode: 'ADMIN_SECRET',
    },
    '/api/v1/auth/logout': {
      sessionId: 'sess_clx1234abcd5678',
    },
    '/api/v1/judge/execute': {
      languageId: 71,
      sourceCode: 'print("Hello, World!")',
      stdin: '',
      expectedOutput: 'Hello, World!',
    },
    '/api/v1/questions/import': {
      filename: 'technical_dataset_v1.json',
    },
    '/api/v1/notifications/read/:id': {},
  };

  // Match by normalized path (replace :param with :param for lookup)
  const example = examples[path] ?? {
    note: `Request body for ${path}`,
  };

  return {
    required: true,
    content: {
      'application/json': {
        schema: { type: 'object' },
        example,
      },
    },
  };
}

/**
 * Builds standard success response for a given endpoint.
 */
function buildSuccessResponse(endpoint: ApiEndpoint): object {
  const path = endpoint.path;

  const exampleData: Record<string, object> = {
    '/api/v1/auth/login': {
      success: true,
      data: {
        accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'clx1234abcd5678efgh',
          email: 'student@example.com',
          roles: ['STUDENT'],
        },
      },
      message: 'Login successful',
    },
    '/api/v1/questions': {
      success: true,
      data: [
        {
          id: 'clx1234abcd5678efgh',
          title: 'Two Sum',
          difficulty: 'Easy',
          category: 'Arrays',
          tags: ['array', 'hash-table'],
        },
      ],
      pagination: { page: 1, limit: 10, total: 320, totalPages: 32 },
    },
    '/api/v1/questions/:id': {
      success: true,
      data: {
        id: 'clx1234abcd5678efgh',
        title: 'Two Sum',
        description: 'Given an array of integers nums and an integer target...',
        difficulty: 'Easy',
        category: 'Arrays',
        tags: ['array', 'hash-table'],
        examples: [{ input: '[2,7,11,15], 9', output: '[0,1]' }],
      },
    },
    '/api/v1/judge/execute': {
      success: true,
      data: {
        status: { id: 3, description: 'Accepted' },
        stdout: 'Hello, World!\n',
        stderr: null,
        time: '0.032',
        memory: 8960,
      },
    },
    '/api/v1/interviews/:id/start': {
      success: true,
      data: {
        interviewId: 'clx1234abcd5678efgh',
        status: 'In Progress',
        startedAt: '2026-08-07T13:00:00.000Z',
      },
      message: 'Interview Started via SessionService',
    },
    '/api/v1/users/': {
      success: true,
      data: {
        id: 'clx1234abcd5678efgh',
        email: 'student@example.com',
        firstName: 'Arjun',
        lastName: 'Kumar',
        completionPercentage: 65,
      },
    },
  };

  const example = exampleData[path] ?? {
    success: true,
    data: {},
    message: 'Success',
  };

  return {
    description: 'Successful response',
    content: {
      'application/json': {
        schema: { type: 'object' },
        example,
      },
    },
  };
}

// ─── Standard Error Responses ─────────────────────────────────────────────────

const STANDARD_ERROR_RESPONSES = {
  '400': {
    description: 'Bad Request — Validation failed',
    content: {
      'application/json': {
        schema: { type: 'object' },
        example: {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Request body is invalid.' },
        },
      },
    },
  },
  '401': {
    description: 'Unauthorized — JWT token missing or invalid',
    content: {
      'application/json': {
        schema: { type: 'object' },
        example: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        },
      },
    },
  },
  '403': {
    description: 'Forbidden — Insufficient permissions',
    content: {
      'application/json': {
        schema: { type: 'object' },
        example: {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' },
        },
      },
    },
  },
  '404': {
    description: 'Not Found — Resource does not exist',
    content: {
      'application/json': {
        schema: { type: 'object' },
        example: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
        },
      },
    },
  },
  '409': {
    description: 'Conflict — Resource already exists',
    content: {
      'application/json': {
        schema: { type: 'object' },
        example: {
          success: false,
          error: { code: 'CONFLICT', message: 'A resource with this identifier already exists.' },
        },
      },
    },
  },
  '422': {
    description: 'Unprocessable Entity — Semantic validation failed',
    content: {
      'application/json': {
        schema: { type: 'object' },
        example: {
          success: false,
          error: { code: 'UNPROCESSABLE_ENTITY', message: 'The request data could not be processed.' },
        },
      },
    },
  },
  '500': {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: { type: 'object' },
        example: {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
        },
      },
    },
  },
  '502': {
    description: 'Bad Gateway — Upstream microservice unavailable',
    content: {
      'application/json': {
        schema: { type: 'object' },
        example: {
          success: false,
          error: { code: 'BAD_GATEWAY', message: 'The upstream service is currently unavailable.' },
        },
      },
    },
  },
};

// ─── Gateway Meta Paths ───────────────────────────────────────────────────────

const GATEWAY_META_PATHS: Record<string, object> = {
  '/': {
    get: {
      tags: ['Gateway'],
      summary: 'Gateway landing page',
      description: 'Returns gateway information including version, uptime, node version, platform, and links to all portal endpoints.',
      operationId: 'getGatewayRoot',
      responses: {
        '200': {
          description: 'Gateway information',
          content: {
            'application/json': {
              schema: { type: 'object' },
              example: {
                success: true,
                name: 'NM Mock Interview API Gateway',
                version: '1.0.0',
                environment: 'development',
                status: 'Running',
                uptime: '245s',
                node: 'v22.20.0',
                platform: 'win32',
                registeredServices: 12,
                activeServices: 5,
                documentation: '/docs',
                health: '/health',
                gateway: '/gateway',
                services: '/services',
              },
            },
          },
        },
      },
    },
  },
  '/gateway': {
    get: {
      tags: ['Gateway'],
      summary: 'Gateway runtime diagnostics',
      description: 'Returns detailed gateway diagnostics including memory usage, PID, proxy config, and service counts.',
      operationId: 'getGatewayDiagnostics',
      responses: {
        '200': {
          description: 'Gateway diagnostics',
          content: {
            'application/json': {
              schema: { type: 'object' },
              example: {
                success: true,
                gateway: { version: '1.0.0', environment: 'development', proxyPrefix: '/api/v1', requestTimeout: '30s' },
                runtime: { uptime: '245s', nodeVersion: 'v22.20.0', platform: 'win32', pid: 19624 },
                memory: { rss: '76.16 MB', heapUsed: '16.21 MB', heapTotal: '18.63 MB', external: '3.67 MB' },
                services: { total: 12, active: 5, inactive: 7 },
              },
            },
          },
        },
      },
    },
  },
  '/services': {
    get: {
      tags: ['Gateway'],
      summary: 'Live service health probes',
      description: 'Performs real-time HTTP GET /health probes against all 12 registered services concurrently. Reports Healthy, Degraded, Unreachable, or Inactive.',
      operationId: 'getServiceHealth',
      responses: {
        '200': {
          description: 'Live health results for all services',
          content: {
            'application/json': {
              schema: { type: 'object' },
              example: {
                success: true,
                summary: { total: 12, healthy: 5, degraded: 0, unreachable: 0, inactive: 7 },
                services: [
                  { name: 'Auth Service', route: '/api/v1/auth', status: 'Healthy', latency: '20ms' },
                  { name: 'User Service', route: '/api/v1/users', status: 'Healthy', latency: '10ms' },
                ],
              },
            },
          },
        },
      },
    },
  },
  '/api': {
    get: {
      tags: ['Gateway'],
      summary: 'API discovery — all public routes',
      description: 'Returns all public API endpoints grouped by service, sourced dynamically from the GatewayManifest.',
      operationId: 'getApiDiscovery',
      responses: {
        '200': {
          description: 'Full API directory',
          content: {
            'application/json': {
              schema: { type: 'object' },
              example: {
                success: true,
                totalServices: 12,
                totalEndpoints: 31,
                routes: [
                  {
                    service: 'Auth Service',
                    route: '/api/v1/auth',
                    endpoints: [
                      { method: 'POST', path: '/api/v1/auth/login', auth: false },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
  '/health': {
    get: {
      tags: ['Gateway'],
      summary: 'Gateway health check',
      description: 'Standard health check endpoint from BaseApplication. Returns OK when the gateway process is alive.',
      operationId: 'getHealth',
      responses: {
        '200': {
          description: 'Gateway is healthy',
          content: {
            'application/json': {
              schema: { type: 'object' },
              example: { success: true, data: { status: 'OK', service: 'API-Gateway' } },
            },
          },
        },
      },
    },
  },
  '/version': {
    get: {
      tags: ['Gateway'],
      summary: 'Gateway version',
      operationId: 'getVersion',
      responses: { '200': { description: 'Version information' } },
    },
  },
  '/metrics': {
    get: {
      tags: ['Gateway'],
      summary: 'Gateway process metrics (uptime, memory)',
      operationId: 'getMetrics',
      responses: { '200': { description: 'Process metrics' } },
    },
  },
};

// ─── Spec Builder ─────────────────────────────────────────────────────────────

/**
 * Builds the complete OpenAPI 3.0.3 specification object.
 * All microservice paths are generated from GatewayManifest — no duplication.
 */
export function buildOpenAPISpec(): OpenAPISpec {
  // ── Tags: one per service ──────────────────────────────────────────────────
  const tags = [
    { name: 'Gateway', description: 'Gateway portal and meta endpoints' },
    ...GatewayManifest.map((service) => ({
      name: service.name,
      description: `${service.description}${service.active ? '' : ' ⚠️ *Service not yet deployed*'}`,
    })),
  ];

  // ── Paths: generated from each endpoint in the manifest ───────────────────
  const microservicePaths: Record<string, Record<string, object>> = {};

  for (const service of GatewayManifest) {
    for (const endpoint of service.endpoints) {
      const openAPIPath = toOpenAPIPath(endpoint.path);
      const pathParams = extractPathParams(endpoint.path);
      const method = endpoint.method.toLowerCase();

      if (!microservicePaths[openAPIPath]) {
        microservicePaths[openAPIPath] = {};
      }

      const requestBody = buildRequestBody(endpoint);
      const successResponse = buildSuccessResponse(endpoint);

      const operation: Record<string, unknown> = {
        tags: [service.name],
        summary: endpoint.description,
        description: `${endpoint.description}. Proxied from \`${service.url}\`.${
          service.active ? '' : '\n\n> ⚠️ **This service is not yet deployed.**'
        }`,
        operationId: `${method}_${openAPIPath.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`,
        parameters: buildPathParameters(pathParams),
        responses: {
          '200': successResponse,
          ...STANDARD_ERROR_RESPONSES,
        },
      };

      if (endpoint.auth) {
        operation.security = [{ BearerAuth: [] }];
      }

      if (requestBody) {
        operation.requestBody = requestBody;
      }

      microservicePaths[openAPIPath][method] = operation;
    }
  }

  // ── Assemble final spec ────────────────────────────────────────────────────
  return {
    openapi: '3.0.3',
    info: {
      title: 'NM Mock Interview Platform — API Gateway',
      version: '1.0.0',
      description: [
        '## Enterprise API Gateway',
        '',
        'Professional API Gateway for the **Naan Mudhalvan Automated Technical Mock Interview Platform**.',
        '',
        '### Architecture',
        '- All requests are proxied through this gateway to individual microservices',
        '- Protected endpoints require a valid **RS256 JWT** in the `Authorization` header',
        '- Use the **Authorize** button to set your Bearer token once and test all APIs',
        '',
        '### Authentication',
        'Obtain a token via `POST /api/v1/auth/login`, then click **Authorize** and enter: `Bearer <your_token>`',
        '',
        '### Quick Start',
        '1. `POST /api/v1/auth/login` → get `accessToken`',
        '2. Click **Authorize** → enter `Bearer <accessToken>`',
        '3. Explore and test all protected endpoints',
      ].join('\n'),
      contact: {
        name: 'NM Platform Team',
        email: 'support@nm-interview.example.com',
        url: 'http://localhost:5173',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development — Local Gateway',
      },
      {
        url: 'https://api.nm-interview.example.com',
        description: 'Production (placeholder)',
      },
    ],
    tags,
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'RS256-signed JWT. Obtain via POST /api/v1/auth/login.',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string', example: 'Success' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'UNAUTHORIZED' },
                message: { type: 'string', example: 'Authentication required.' },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 320 },
                totalPages: { type: 'integer', example: 32 },
              },
            },
          },
        },
      },
    },
    paths: {
      ...GATEWAY_META_PATHS,
      ...microservicePaths,
    },
  };
}
