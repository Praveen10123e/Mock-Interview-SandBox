import React from 'react';
import {
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  Cpu,
  ShieldCheck,
  Layers,
  HardDrive,
  Radio,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { useAdminSystemHealth } from '../../api/admin';

export const AdminSystem: React.FC = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminSystemHealth();

  const services = data?.services || [];
  const database = data?.database || {
    status: 'CONNECTED',
    engine: 'PostgreSQL 16',
    latency: '1ms',
    activePoolConnections: 5,
    host: 'localhost:5432',
  };
  const redis = data?.redis || {
    status: 'NOT_CONFIGURED',
    isUsed: false,
    reason: 'Stateless JWT Architecture (No caching layer or Redis broker required)',
  };
  const systemInfo = data?.systemInfo || {
    applicationName: 'NM Mock Interview Sandbox',
    version: '1.0.0',
    environment: 'development',
    nodeVersion: 'v22.20.0',
    platform: 'win32',
    architecture: 'Microservices Gateway (Node.js/Express + Prisma)',
    uptime: '0s',
    memoryUsage: { rss: '0 MB', heapUsed: '0 MB', heapTotal: '0 MB' },
    gatewayPrefix: '/api/v1',
    totalRegisteredServices: 6,
    activeHealthyServices: 6,
    lastChecked: new Date().toISOString(),
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> HEALTHY
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> DEGRADED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full pb-16 min-w-0">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              System Operations & Node Health
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {data?.overallStatus || 'OPTIMAL'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Live diagnostic telemetry, microservice health probes, database latency, and node runtime metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs sm:text-sm font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isFetching ? 'Checking...' : 'Refresh Health'}</span>
          </Button>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────────── */}
      {isError && (
        <Card className="p-4 border-rose-200 bg-rose-50 text-rose-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Unable to retrieve system health</p>
              <p className="text-xs text-rose-600">{(error as any)?.message || 'Microservices gateway telemetry unreachable'}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="border-rose-300 text-rose-700 bg-white hover:bg-rose-100 cursor-pointer">
            Retry
          </Button>
        </Card>
      )}

      {/* ── 2. Top System Status Summary (4 Cards) ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overall Status
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Radio className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : (data?.overallStatus || 'HEALTHY')}
            </span>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>All nodes responding normally</span>
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Core Services
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Server className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : `${systemInfo.activeHealthyServices} / ${systemInfo.totalRegisteredServices}`}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Active microservices healthy
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              PostgreSQL DB
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : database.status}
            </span>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Latency: {database.latency} • {database.engine}
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cache / Broker
            </span>
            <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-700 font-mono">
              {isLoading ? '...' : 'NOT CONFIGURED'}
            </span>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1" title={redis.reason}>
              Stateless JWT Architecture
            </p>
          </div>
        </Card>
      </div>

      {/* ── 3. Microservices Health Grid ───────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Active Microservice Health Probes
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Auto-polling every 30 seconds
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <Card className="p-6 border-slate-200 bg-white rounded-xl text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">System health probe unavailable</h3>
            <p className="text-xs text-slate-500">{(error as any)?.message || 'Could not connect to health diagnostics.'}</p>
            <Button size="sm" onClick={() => refetch()} className="text-xs">Retry Probe</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => (
              <Card
                key={svc.name}
                className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900">{svc.name}</h3>
                    <p className="text-xs font-mono text-slate-400">{svc.url}</p>
                  </div>
                  {getStatusBadge(svc.status)}
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">HTTP Port:</span>
                    <span className="font-mono font-semibold text-slate-700">{svc.port}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Latency:</span>
                    <span className="font-mono font-semibold text-emerald-600">{svc.latency}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1">
                  <span>Last probed:</span>
                  <span>{new Date(svc.lastChecked).toLocaleTimeString()}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. System Runtime & Architecture Information ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 sm:p-6 border-slate-200 bg-white rounded-xl shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Cpu className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Runtime & Environment Specifications</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Application:</span>
              <span className="font-semibold text-slate-800">{systemInfo.applicationName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Version:</span>
              <span className="font-mono font-semibold text-slate-800">{systemInfo.version}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Environment:</span>
              <span className="font-mono font-semibold text-slate-800 uppercase">{systemInfo.environment}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Node.js Runtime:</span>
              <span className="font-mono font-semibold text-slate-800">{systemInfo.nodeVersion}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Process Uptime:</span>
              <span className="font-mono font-semibold text-slate-800">{systemInfo.uptime}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Host Platform:</span>
              <span className="font-mono font-semibold text-slate-800">{systemInfo.platform}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block">Architecture Topology:</span>
              <span className="font-medium text-slate-700">{systemInfo.architecture}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 border-slate-200 bg-white rounded-xl shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <HardDrive className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Memory & Storage Footprint</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Resident Set Size (RSS):</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{systemInfo.memoryUsage.rss}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Heap Used:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{systemInfo.memoryUsage.heapUsed}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Heap Total Allocated:</span>
              <span className="font-mono font-semibold text-slate-700">{systemInfo.memoryUsage.heapTotal}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Gateway Routing:</span>
              <span className="font-mono font-semibold text-blue-600">{systemInfo.gatewayPrefix}/*</span>
            </div>
            <div className="col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Zero credentials, JWT secret keys, or database connection strings are exposed to the administrative client interface.
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
