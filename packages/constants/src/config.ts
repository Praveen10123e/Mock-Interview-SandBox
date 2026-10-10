export const API_VERSIONS = {
  V1: '/api/v1',
} as const;

export const DEFAULT_CONFIG = {
  PAGINATION_LIMIT: 10,
  MAX_PAGINATION_LIMIT: 100,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const;
