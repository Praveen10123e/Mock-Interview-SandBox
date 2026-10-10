import { PrismaClient, Education, Prisma } from '../generated/client';
import { BaseRepository } from '@nm/api-base';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class EducationRepository extends BaseRepository<
  Education,
  Prisma.EducationCreateInput,
  Prisma.EducationUpdateInput
> {
  async findById(id: string): Promise<Education | null> {
    return prisma.education.findUnique({ where: { id } });
  }

  async findAll(options?: any): Promise<Education[]> {
    return prisma.education.findMany(options);
  }

  async create(data: Prisma.EducationCreateInput): Promise<Education> {
    return prisma.education.create({ data });
  }

  async update(id: string, data: Prisma.EducationUpdateInput): Promise<Education> {
    return prisma.education.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.education.delete({ where: { id } });
    return true;
  }
}
