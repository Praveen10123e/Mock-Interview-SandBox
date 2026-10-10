import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { DEFAULT_CONFIG } from '@nm/constants';

const getOriginOption = () => {
  const envOrigin = process.env.CORS_ORIGIN;
  if (!envOrigin || envOrigin === '*') {
    return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (curl, server-to-server) or reflect origin for local development
      return callback(null, true);
    };
  }

  const allowedOrigins = envOrigin.split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }
    return callback(null, false);
  };
};

export const securityMiddleware = [
  helmet({ crossOriginResourcePolicy: false }),
  cors({
    origin: getOriginOption(),
    credentials: true,
  }),
  compression(),
];

export const globalRateLimiter = rateLimit({
  windowMs: DEFAULT_CONFIG.RATE_LIMIT_WINDOW_MS,
  max: DEFAULT_CONFIG.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
