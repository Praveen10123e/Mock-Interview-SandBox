import { PrismaClient, Role, Prisma } from '../generated/client';
import { BaseRepository } from '@nm/api-base';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class RoleRepository extends BaseRepository<
  Role,
  Prisma.RoleCreateInput,
  Prisma.RoleUpdateInput
> {
  async findById(id: string): Promise<Role | null> {
    return prisma.role.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<Role | null> {
    return prisma.role.findUnique({ where: { name } });
  }

  async findAll(options?: any): Promise<Role[]> {
    return prisma.role.findMany(options);
  }

  async create(data: Prisma.RoleCreateInput): Promise<Role> {
    return prisma.role.create({ data });
  }

  async update(id: string, data: Prisma.RoleUpdateInput): Promise<Role> {
    return prisma.role.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.role.delete({ where: { id } });
    return true;
  }
}
