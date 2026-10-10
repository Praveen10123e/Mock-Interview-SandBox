import { BaseService } from '@nm/api-base';
import { SessionRepository } from '../repositories/SessionRepository';
import { TokenRepository } from '../repositories/TokenRepository';
import crypto from 'crypto';

export class SessionService extends BaseService {
  private sessionRepo: SessionRepository;
  private tokenRepo: TokenRepository;

  constructor() {
    super('SessionService');
    this.sessionRepo = new SessionRepository();
    this.tokenRepo = new TokenRepository();
  }

  public async createSession(identityId: string, ipAddress?: string, userAgent?: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.sessionRepo.create({
      identity: { connect: { id: identityId } },
      token,
      ipAddress,
      userAgent,
      expiresAt,
    });

    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');

    await this.tokenRepo.createRefreshToken({
      identity: { connect: { id: identityId } },
      tokenHash,
      expiresAt,
    });

    return { session, refreshTokenString };
  }

  public async revokeSession(sessionId: string) {
    await this.sessionRepo.delete(sessionId);
  }

  public async revokeAllUserSessions(identityId: string) {
    await this.sessionRepo.revokeAllForIdentity(identityId);
    await this.tokenRepo.revokeAllRefreshTokens(identityId);
  }
}
