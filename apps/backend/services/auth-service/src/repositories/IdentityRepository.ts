import { PrismaClient, Identity, Prisma } from '../generated/client';
import { BaseRepository } from '@nm/api-base';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class IdentityRepository extends BaseRepository<
  Identity,
  Prisma.IdentityCreateInput,
  Prisma.IdentityUpdateInput
> {
  async findById(id: string): Promise<Identity | null> {
    return prisma.identity.findUnique({
      where: { id },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
  }

  async findByEmail(email: string): Promise<Identity | null> {
    return prisma.identity.findUnique({
      where: { email },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
  }

  async findAll(options?: any): Promise<Identity[]> {
    return prisma.identity.findMany(options);
  }

  async create(data: Prisma.IdentityCreateInput): Promise<Identity> {
    return prisma.identity.create({ data });
  }

  async update(id: string, data: Prisma.IdentityUpdateInput): Promise<Identity> {
    return prisma.identity.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.identity.delete({ where: { id } });
    return true;
  }
}
