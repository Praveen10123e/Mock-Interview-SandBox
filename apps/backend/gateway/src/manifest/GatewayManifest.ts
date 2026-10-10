/**
 * GatewayManifest — Single source of truth for service metadata and public API routes.
 *
 * This manifest is used by:
 *   - GET /services  → live health checks
 *   - GET /api       → API discovery endpoint
 *
 * Add new services and routes here only. No other file should duplicate this data.
 */

export interface ServiceManifestEntry {
  /** Human-readable display name */
  name: string;
  /** Registry key (must match ServiceRegistry key) */
  key: string;
  /** Gateway route prefix */
  route: string;
  /** Internal service URL */
  url: string;
  /** Service description */
  description: string;
  /** Whether the service is currently deployed */
  active: boolean;
  /** Public API endpoints exposed by this service */
  endpoints: ApiEndpoint[];
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  auth: boolean;
}

const BASE_HOST = process.env.GATEWAY_HOST || 'localhost';

const resolveManifestUrl = (envUrl: string | undefined, defaultPort: number | string): string => {
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return `http://${BASE_HOST}:${defaultPort}`;
};

export const GatewayManifest: ServiceManifestEntry[] = [
  {
    name: 'Auth Service',
    key: 'auth',
    route: '/api/v1/auth',
    url: resolveManifestUrl(process.env.AUTH_SERVICE_URL, process.env.AUTH_SERVICE_PORT || 3001),
    description: 'Handles authentication, registration, and JWT session management.',
    active: true,
    endpoints: [
      { method: 'POST', path: '/api/v1/auth/register/student', description: 'Register a new student account', auth: false },
      { method: 'POST', path: '/api/v1/auth/register/faculty', description: 'Register a new faculty account', auth: false },
      { method: 'POST', path: '/api/v1/auth/register/admin', description: 'Register a new admin account', auth: false },
      { method: 'POST', path: '/api/v1/auth/login', description: 'Authenticate and receive JWT tokens', auth: false },
      { method: 'POST', path: '/api/v1/auth/logout', description: 'Invalidate the current session', auth: true },
    ],
  },
  {
    name: 'User Service',
    key: 'users',
    route: '/api/v1/users',
    url: resolveManifestUrl(process.env.USER_SERVICE_URL, process.env.USER_SERVICE_PORT || 3002),
    description: 'Manages student and faculty profiles, skills, education, and completion tracking.',
    active: true,
    endpoints: [
      { method: 'GET',  path: '/api/v1/users/',                 description: 'Get the authenticated user\'s profile', auth: true },
      { method: 'GET',  path: '/api/v1/users/:identityId',      description: 'Get a user profile by identity ID', auth: true },
      { method: 'PUT',  path: '/api/v1/users/',                 description: 'Update the authenticated user\'s profile', auth: true },
      { method: 'GET',  path: '/api/v1/users/me/completion',    description: 'Get profile completion percentage', auth: true },
    ],
  },
  {
    name: 'Interview Service',
    key: 'interviews',
    route: '/api/v1/interviews',
    url: resolveManifestUrl(process.env.INTERVIEW_SERVICE_URL, process.env.INTERVIEW_SERVICE_PORT || 3004),
    description: 'Manages interview state, lifecycle, timelines, and session orchestration.',
    active: true,
    endpoints: [
      { method: 'POST', path: '/api/v1/interviews/:id/start',     description: 'Start an interview session', auth: true },
      { method: 'POST', path: '/api/v1/interviews/:id/heartbeat', description: 'Send a session heartbeat', auth: true },
      { method: 'GET',  path: '/api/v1/interviews/:id/timeline',  description: 'Retrieve the interview timeline', auth: true },
      { method: 'POST', path: '/api/v1/interviews/:id/execute',   description: 'Execute code within an interview session', auth: true },
    ],
  },
  {
    name: 'Question Bank Service',
    key: 'questions',
    route: '/api/v1/questions',
    url: resolveManifestUrl(process.env.QUESTION_BANK_SERVICE_URL, process.env.QUESTION_BANK_SERVICE_PORT || 3005),
    description: 'Stores, indexes, and retrieves technical interview questions with full-text search.',
    active: true,
    endpoints: [
      { method: 'GET', path: '/api/v1/questions',             description: 'Search and list questions', auth: true },
      { method: 'GET', path: '/api/v1/questions/:id',         description: 'Get a question by ID', auth: true },
      { method: 'GET', path: '/api/v1/questions/categories',  description: 'List all question categories', auth: true },
      { method: 'GET', path: '/api/v1/questions/topics',      description: 'List all topics', auth: true },
      { method: 'GET', path: '/api/v1/questions/languages',   description: 'List supported programming languages', auth: true },
      { method: 'GET', path: '/api/v1/questions/tags',        description: 'List all tags', auth: true },
      { method: 'GET', path: '/api/v1/questions/statistics',  description: 'Get question bank statistics', auth: true },
      { method: 'POST', path: '/api/v1/questions/import',     description: 'Trigger dataset import (admin)', auth: true },
    ],
  },
  {
    name: 'Judge Service',
    key: 'judge',
    route: '/api/v1/judge',
    url: resolveManifestUrl(process.env.JUDGE_SERVICE_URL, process.env.JUDGE_SERVICE_PORT || 3006),
    description: 'Connects to Judge0 for sandboxed code execution across multiple languages.',
    active: true,
    endpoints: [
      { method: 'POST', path: '/api/v1/judge/execute',   description: 'Execute code in a sandboxed environment', auth: true },
      { method: 'GET',  path: '/api/v1/judge/languages', description: 'List supported execution languages', auth: true },
    ],
  },
  {
    name: 'Faculty Service',
    key: 'faculty',
    route: '/api/v1/faculty',
    url: resolveManifestUrl(process.env.FACULTY_SERVICE_URL, process.env.FACULTY_SERVICE_PORT || 3007),
    description: 'Handles faculty-specific operations, interview templates, and student management.',
    active: false,
    endpoints: [
      { method: 'GET',  path: '/api/v1/faculty/students',   description: 'List managed students', auth: true },
      { method: 'GET',  path: '/api/v1/faculty/templates',  description: 'List interview templates', auth: true },
      { method: 'POST', path: '/api/v1/faculty/templates',  description: 'Create an interview template', auth: true },
    ],
  },
  {
    name: 'Admin Service',
    key: 'admin',
    route: '/api/v1/admin',
    url: resolveManifestUrl(
      process.env.ADMIN_SERVICE_URL || process.env.INTERVIEW_SERVICE_URL,
      process.env.ADMIN_SERVICE_PORT || 3008,
    ),
    description: 'Platform administration: user management, system configuration, and data governance.',
    active: false,
    endpoints: [
      { method: 'GET',    path: '/api/v1/admin/users',      description: 'List all platform users', auth: true },
      { method: 'DELETE', path: '/api/v1/admin/users/:id',  description: 'Delete a user account', auth: true },
      { method: 'GET',    path: '/api/v1/admin/system',     description: 'Get system configuration', auth: true },
    ],
  },
  {
    name: 'Analytics Service',
    key: 'analytics',
    route: '/api/v1/analytics',
    url: resolveManifestUrl(process.env.ANALYTICS_SERVICE_URL, process.env.ANALYTICS_SERVICE_PORT || 3009),
    description: 'Aggregates and surfaces performance analytics, heatmaps, and skill gap analysis.',
    active: false,
    endpoints: [
      { method: 'GET', path: '/api/v1/analytics/overview',   description: 'Platform-wide analytics overview', auth: true },
      { method: 'GET', path: '/api/v1/analytics/student/:id', description: 'Per-student analytics', auth: true },
    ],
  },
  {
    name: 'Notification Service',
    key: 'notifications',
    route: '/api/v1/notifications',
    url: resolveManifestUrl(process.env.NOTIFICATION_SERVICE_URL, process.env.NOTIFICATION_SERVICE_PORT || 3010),
    description: 'Manages in-app, email, and push notifications for platform events.',
    active: false,
    endpoints: [
      { method: 'GET',  path: '/api/v1/notifications',          description: 'Get user notifications', auth: true },
      { method: 'POST', path: '/api/v1/notifications/read/:id',  description: 'Mark a notification as read', auth: true },
    ],
  },
  {
    name: 'Recommendation Service',
    key: 'recommendations',
    route: '/api/v1/recommendations',
    url: resolveManifestUrl(process.env.RECOMMENDATION_SERVICE_URL, process.env.RECOMMENDATION_SERVICE_PORT || 3011),
    description: 'AI-powered personalized question and study path recommendations.',
    active: false,
    endpoints: [
      { method: 'GET', path: '/api/v1/recommendations',             description: 'Get personalized recommendations', auth: true },
      { method: 'GET', path: '/api/v1/recommendations/study-path',  description: 'Get AI-generated study path', auth: true },
    ],
  },
  {
    name: 'Replay Service',
    key: 'replay',
    route: '/api/v1/replay',
    url: resolveManifestUrl(process.env.REPLAY_SERVICE_URL, process.env.REPLAY_SERVICE_PORT || 3012),
    description: 'Records and replays interview sessions for post-interview review.',
    active: false,
    endpoints: [
      { method: 'GET', path: '/api/v1/replay/:interviewId', description: 'Retrieve interview session replay', auth: true },
    ],
  },
  {
    name: 'Scoring Service',
    key: 'scoring',
    route: '/api/v1/scoring',
    url: resolveManifestUrl(process.env.SCORING_SERVICE_URL, process.env.SCORING_SERVICE_PORT || 3013),
    description: 'Computes automated coding proficiency scores and evaluation metrics.',
    active: false,
    endpoints: [
      { method: 'GET',  path: '/api/v1/scoring/:interviewId',  description: 'Get interview score', auth: true },
      { method: 'POST', path: '/api/v1/scoring/evaluate',      description: 'Trigger score evaluation', auth: true },
    ],
  },
];
