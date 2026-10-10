export interface ServiceRegistryEntry {
  name: string;
  host: string;
  port: number;
  url: string;
  version: string;
  status: 'active' | 'inactive';
  dependencies: string[];
}

const resolveServiceUrl = (envUrl: string | undefined, host: string, port: number): string => {
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return `http://${host}:${port}`;
};

export const ServiceRegistry: Record<string, ServiceRegistryEntry> = {
  auth: {
    name: 'auth-service',
    host: process.env.AUTH_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
    url: resolveServiceUrl(
      process.env.AUTH_SERVICE_URL,
      process.env.AUTH_SERVICE_HOST || 'localhost',
      parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
    ),
    version: '1.0.0',
    status: 'active',
    dependencies: [],
  },
  users: {
    name: 'user-service',
    host: process.env.USER_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.USER_SERVICE_PORT || '3002', 10),
    url: resolveServiceUrl(
      process.env.USER_SERVICE_URL,
      process.env.USER_SERVICE_HOST || 'localhost',
      parseInt(process.env.USER_SERVICE_PORT || '3002', 10),
    ),
    version: '1.0.0',
    status: 'active',
    dependencies: ['auth'],
  },
  interviews: {
    name: 'interview-service',
    host: process.env.INTERVIEW_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.INTERVIEW_SERVICE_PORT || '3004', 10),
    url: resolveServiceUrl(
      process.env.INTERVIEW_SERVICE_URL,
      process.env.INTERVIEW_SERVICE_HOST || 'localhost',
      parseInt(process.env.INTERVIEW_SERVICE_PORT || '3004', 10),
    ),
    version: '1.0.0',
    status: 'active',
    dependencies: ['auth', 'user', 'question-bank'],
  },
  questions: {
    name: 'question-bank-service',
    host: process.env.QUESTION_BANK_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.QUESTION_BANK_SERVICE_PORT || '3005', 10),
    url: resolveServiceUrl(
      process.env.QUESTION_BANK_SERVICE_URL,
      process.env.QUESTION_BANK_SERVICE_HOST || 'localhost',
      parseInt(process.env.QUESTION_BANK_SERVICE_PORT || '3005', 10),
    ),
    version: '1.0.0',
    status: 'active',
    dependencies: ['auth'],
  },
  judge: {
    name: 'judge-service',
    host: process.env.JUDGE_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.JUDGE_SERVICE_PORT || '3006', 10),
    url: resolveServiceUrl(
      process.env.JUDGE_SERVICE_URL,
      process.env.JUDGE_SERVICE_HOST || 'localhost',
      parseInt(process.env.JUDGE_SERVICE_PORT || '3006', 10),
    ),
    version: '1.0.0',
    status: 'active',
    dependencies: [],
  },
  templates: {
    name: 'interview-service',
    host: process.env.INTERVIEW_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.INTERVIEW_SERVICE_PORT || '3004', 10),
    url: resolveServiceUrl(
      process.env.INTERVIEW_SERVICE_URL,
      process.env.INTERVIEW_SERVICE_HOST || 'localhost',
      parseInt(process.env.INTERVIEW_SERVICE_PORT || '3004', 10),
    ),
    version: '1.0.0',
    status: 'active',
    dependencies: ['auth', 'user', 'question-bank'],
  },
  admin: {
    name: 'interview-service',
    host: process.env.INTERVIEW_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.INTERVIEW_SERVICE_PORT || '3004', 10),
    url: resolveServiceUrl(
      process.env.INTERVIEW_SERVICE_URL,
      process.env.INTERVIEW_SERVICE_HOST || 'localhost',
      parseInt(process.env.INTERVIEW_SERVICE_PORT || '3004', 10),
    ),
    version: '1.0.0',
    status: 'active',
    dependencies: ['auth', 'user', 'interview'],
  },
};
