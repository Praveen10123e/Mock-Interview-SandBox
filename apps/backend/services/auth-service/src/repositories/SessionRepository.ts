import { PrismaClient, Session, Prisma } from '../generated/client';
import { BaseRepository } from '@nm/api-base';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class SessionRepository extends BaseRepository<
  Session,
  Prisma.SessionCreateInput,
  Prisma.SessionUpdateInput
> {
  async findById(id: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { id } });
  }

  async findByToken(token: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { token } });
  }

  async findActiveByIdentity(identityId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: {
        identityId,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findAll(options?: any): Promise<Session[]> {
    return prisma.session.findMany(options);
  }

  async create(data: Prisma.SessionCreateInput): Promise<Session> {
    return prisma.session.create({ data });
  }

  async update(id: string, data: Prisma.SessionUpdateInput): Promise<Session> {
    return prisma.session.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.session.delete({ where: { id } });
    return true;
  }

  async revokeAllForIdentity(identityId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { identityId } });
  }
}
