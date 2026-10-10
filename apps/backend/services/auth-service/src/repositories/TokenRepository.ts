import { PrismaClient, RefreshToken, Prisma } from '../generated/client';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class TokenRepository {
  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async createRefreshToken(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  async revokeAllRefreshTokens(identityId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { identityId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async createPasswordResetToken(identityId: string, tokenHash: string, expiresAt: Date) {
    return prisma.passwordResetToken.create({
      data: {
        identityId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findPasswordResetToken(identityId: string, tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: { identityId, tokenHash },
    });
  }

  async deletePasswordResetTokensForIdentity(identityId: string) {
    return prisma.passwordResetToken.deleteMany({
      where: { identityId },
    });
  }

  async deletePasswordResetTokenById(id: string) {
    return prisma.passwordResetToken.delete({
      where: { id },
    });
  }
}
