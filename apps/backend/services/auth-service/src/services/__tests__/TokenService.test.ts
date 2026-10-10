import { describe, it, expect, beforeAll } from 'vitest';
import { TokenService } from '../TokenService';

describe('TokenService RS256 JWT Generation', () => {
  let tokenService: TokenService;

  beforeAll(() => {
    tokenService = new TokenService();
  });

  it('should generate and verify an RS256 access token', () => {
    const payload = {
      sub: 'user-123',
      email: 'test@example.com',
      roles: ['STUDENT'],
      permissions: [],
    };

    const token = tokenService.generateAccessToken(payload);
    expect(token).toBeDefined();

    const decoded = tokenService.verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.roles).toContain('STUDENT');
  });

  it('should generate a secure random refresh token', () => {
    const refreshToken = tokenService.generateRefreshToken();
    expect(refreshToken).toBeDefined();
    expect(refreshToken.length).toBeGreaterThan(40);
  });
});
