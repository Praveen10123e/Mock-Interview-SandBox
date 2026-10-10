import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { IJwtPayload } from '@nm/types';
import { BaseService } from '@nm/api-base';

export class TokenService extends BaseService {
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly accessTokenExpiresIn = '15m'; // 15 minutes
  private readonly refreshTokenExpiresIn = '7d'; // 7 days

  constructor() {
    super('TokenService');

    const keysDir = path.resolve(__dirname, '../../../../../../keys');

    const privateKeyFromEnv = process.env.JWT_PRIVATE_KEY;
    const publicKeyFromEnv = process.env.JWT_PUBLIC_KEY;

    this.privateKey = privateKeyFromEnv
      ? privateKeyFromEnv.replace(/\\n/g, '\n')
      : fs.readFileSync(path.join(keysDir, 'private.pem'), 'utf8');

    this.publicKey = publicKeyFromEnv
      ? publicKeyFromEnv.replace(/\\n/g, '\n')
      : fs.readFileSync(path.join(keysDir, 'public.pem'), 'utf8');
  }

  public generateAccessToken(payload: IJwtPayload): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessTokenExpiresIn,
    });
  }

  public generateRefreshToken(): string {
    // Refresh tokens are opaque secure random strings for rotation
    const crypto = require('crypto');
    return crypto.randomBytes(40).toString('hex');
  }

  public verifyAccessToken(token: string): IJwtPayload {
    return jwt.verify(token, this.publicKey, { algorithms: ['RS256'] }) as IJwtPayload;
  }

  public generatePasswordResetJwt(identityId: string, email: string): string {
    return jwt.sign(
      { sub: identityId, email, purpose: 'PASSWORD_RESET' },
      this.privateKey,
      { algorithm: 'RS256', expiresIn: '10m' }
    );
  }

  public verifyPasswordResetJwt(token: string): { sub: string; email: string; purpose: string } {
    const payload = jwt.verify(token, this.publicKey, { algorithms: ['RS256'] }) as any;
    if (payload.purpose !== 'PASSWORD_RESET') {
      throw new Error('Invalid token purpose');
    }
    return payload;
  }
}
