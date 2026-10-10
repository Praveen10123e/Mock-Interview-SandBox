import { Request, Response, NextFunction } from 'express';
import { BaseResponse } from '@nm/api-base';
import { HTTP_STATUS, ERROR_MESSAGES } from '@nm/constants';

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

let publicKey: string;

try {
  const publicKeyFromEnv = process.env.JWT_PUBLIC_KEY;

  if (publicKeyFromEnv) {
    publicKey = publicKeyFromEnv.replace(/\\n/g, '\n');
  } else {
    publicKey = fs.readFileSync(
      path.resolve(__dirname, '../../../../../keys/public.pem'),
      'utf8'
    );
  }
} catch (e: any) {
  console.warn('Could not load public key for Gateway auth validation', e.message);
}

export const authPlaceholder = (req: Request, res: Response, next: NextFunction) => {
  const tokenFromQuery = typeof req.query?.token === 'string' ? req.query.token : undefined;
  const authHeader = req.headers.authorization || (tokenFromQuery ? `Bearer ${tokenFromQuery}` : undefined);
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (
      req.path.includes('/auth/login') ||
      req.path.includes('/health') ||
      req.path.includes('/auth/register') ||
      req.path.includes('/auth/forgot-password')
    ) {
      return next();
    }
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(BaseResponse.error('UNAUTHORIZED', ERROR_MESSAGES.UNAUTHORIZED));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as any;
    req.headers['x-identity-id'] = decoded.sub;
    req.headers['x-user-role'] = decoded.roles ? decoded.roles.join(',') : '';
    if (decoded.email) {
      req.headers['x-user-email'] = decoded.email;
    }
    next();
  } catch (err: any) {
    console.error('JWT Verification failed:', err.message);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(BaseResponse.error('UNAUTHORIZED', 'Invalid or expired token'));
  }
};

export const authzPlaceholder = (req: Request, res: Response, next: NextFunction) => {
  // Placeholder for role/permission check
  const role = req.headers['x-user-role'];
  if (role && role === 'BANNED') {
    return res
      .status(HTTP_STATUS.FORBIDDEN)
      .json(BaseResponse.error('FORBIDDEN', ERROR_MESSAGES.FORBIDDEN));
  }
  next();
};
