import http from 'http';
import https from 'https';
import { Request, Response } from 'express';
import { BaseController } from '@nm/api-base';
import { GatewayManifest, ServiceManifestEntry } from '../manifest/GatewayManifest';

const GATEWAY_START_TIME = Date.now();

// ─── Health Probe ─────────────────────────────────────────────────────────────

interface ServiceProbeResult {
  name: string;
  route: string;
  url: string;
  status: 'Healthy' | 'Degraded' | 'Unreachable' | 'Inactive';
  latency: string;
  description: string;
  active: boolean;
}

/**
 * Performs a native HTTP/HTTPS GET /health probe against a service URL.
 * Supports both http and https protocols seamlessly.
 * Never throws; always resolves with a result.
 */
function probeService(service: ServiceManifestEntry): Promise<ServiceProbeResult> {
  return new Promise((resolve) => {
    if (!service.active) {
      return resolve({
        name: service.name,
        route: service.route,
        url: service.url,
        status: 'Inactive',
        latency: 'N/A',
        description: service.description,
        active: false,
      });
    }

    const start = Date.now();
    try {
      const urlObj = new URL(service.url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      const port = urlObj.port ? Number(urlObj.port) : (isHttps ? 443 : 80);

      const req = client.request(
        {
          protocol: urlObj.protocol,
          hostname: urlObj.hostname,
          port,
          path: '/health',
          method: 'GET',
          timeout: 4000,
          headers: {
            'User-Agent': 'API-Gateway-Health-Probe/1.0',
          },
        },
        (res) => {
          const latency = `${Date.now() - start}ms`;
          res.resume(); // drain to free socket
          resolve({
            name: service.name,
            route: service.route,
            url: service.url,
            status: res.statusCode === 200 ? 'Healthy' : 'Degraded',
            latency,
            description: service.description,
            active: true,
          });
        },
      );

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: service.name,
        route: service.route,
        url: service.url,
        status: 'Unreachable',
        latency: 'timeout',
        description: service.description,
        active: true,
      });
    });

    req.on('error', () => {
      resolve({
        name: service.name,
        route: service.route,
        url: service.url,
        status: 'Unreachable',
        latency: 'N/A',
        description: service.description,
        active: true,
      });
    });

    req.end();
    } catch {
      resolve({
        name: service.name,
        route: service.route,
        url: service.url,
        status: 'Unreachable',
        latency: 'N/A',
        description: service.description,
        active: true,
      });
    }
  });
}

// ─── Controller ───────────────────────────────────────────────────────────────

export class GatewayController extends BaseController {
  /**
   * GET /
   * Professional gateway information landing response.
   */
  public getRoot = (_req: Request, res: Response): void => {
    const uptimeSeconds = Math.floor((Date.now() - GATEWAY_START_TIME) / 1000);
    const activeServices = GatewayManifest.filter((s) => s.active).length;

    res.status(200).json({
      success: true,
      name: 'NM Mock Interview API Gateway',
      description:
        'Enterprise API Gateway for the Naan Mudhalvan Automated Technical Mock Interview Platform',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      status: 'Running',
      timestamp: new Date().toISOString(),
      uptime: `${uptimeSeconds}s`,
      node: process.version,
      platform: process.platform,
      registeredServices: GatewayManifest.length,
      activeServices,
      documentation: '/docs',
      apiDiscovery: '/api',
      health: '/health',
      gateway: '/gateway',
      services: '/services',
    });
  };

  /**
   * GET /gateway
   * Detailed gateway diagnostics — memory, uptime, runtime, service counts.
   */
  public getGateway = (_req: Request, res: Response): void => {
    const uptimeSeconds = Math.floor((Date.now() - GATEWAY_START_TIME) / 1000);
    const mem = process.memoryUsage();

    const formatBytes = (bytes: number): string =>
      `${(bytes / 1024 / 1024).toFixed(2)} MB`;

    res.status(200).json({
      success: true,
      gateway: {
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        proxyPrefix: '/api/v1',
        requestTimeout: '30s',
      },
      runtime: {
        uptime: `${uptimeSeconds}s`,
        startedAt: new Date(Date.now() - uptimeSeconds * 1000).toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
      },
      memory: {
        rss: formatBytes(mem.rss),
        heapUsed: formatBytes(mem.heapUsed),
        heapTotal: formatBytes(mem.heapTotal),
        external: formatBytes(mem.external),
      },
      services: {
        total: GatewayManifest.length,
        active: GatewayManifest.filter((s) => s.active).length,
        inactive: GatewayManifest.filter((s) => !s.active).length,
      },
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * GET /services
   * Performs live HTTP health probes against every registered service concurrently.
   * Never fails the endpoint even if services are unreachable.
   */
  public getServices = async (_req: Request, res: Response): Promise<void> => {
    const results = await Promise.all(GatewayManifest.map(probeService));

    const healthy = results.filter((s) => s.status === 'Healthy').length;
    const degraded = results.filter((s) => s.status === 'Degraded').length;
    const unreachable = results.filter((s) => s.status === 'Unreachable').length;
    const inactive = results.filter((s) => s.status === 'Inactive').length;

    res.status(200).json({
      success: true,
      summary: {
        total: results.length,
        healthy,
        degraded,
        unreachable,
        inactive,
      },
      timestamp: new Date().toISOString(),
      services: results,
    });
  };

  /**
   * GET /api
   * Returns all public API endpoints grouped by service, sourced from GatewayManifest.
   * No routes are hardcoded here — the manifest is the single source of truth.
   */
  public getApiDiscovery = (_req: Request, res: Response): void => {
    const grouped = GatewayManifest.map((service) => ({
      service: service.name,
      route: service.route,
      description: service.description,
      active: service.active,
      endpoints: service.endpoints.map((ep) => ({
        method: ep.method,
        path: ep.path,
        description: ep.description,
        auth: ep.auth,
      })),
    }));

    const totalEndpoints = GatewayManifest.reduce(
      (acc, s) => acc + s.endpoints.length,
      0,
    );

    res.status(200).json({
      success: true,
      name: 'NM Mock Interview Platform — API Directory',
      version: '1.0.0',
      proxyBase: '/api/v1',
      totalServices: GatewayManifest.length,
      totalEndpoints,
      timestamp: new Date().toISOString(),
      routes: grouped,
    });
  };
}
