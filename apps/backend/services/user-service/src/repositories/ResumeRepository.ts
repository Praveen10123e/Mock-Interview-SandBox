import { PrismaClient, Resume, Prisma } from '../generated/client';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class ResumeRepository {
  async findById(id: string): Promise<Resume | null> {
    return prisma.resume.findUnique({ where: { id } });
  }

  async findByProfileId(profileId: string): Promise<Resume[]> {
    return prisma.resume.findMany({ where: { profileId }, orderBy: { version: 'desc' } });
  }

  async create(data: Prisma.ResumeCreateInput): Promise<Resume> {
    return prisma.resume.create({ data });
  }

  async update(id: string, data: Prisma.ResumeUpdateInput): Promise<Resume> {
    return prisma.resume.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.resume.delete({ where: { id } });
  }

  async setInactive(id: string): Promise<void> {
    await prisma.resume.update({ where: { id }, data: { isActive: false } });
  }
}
