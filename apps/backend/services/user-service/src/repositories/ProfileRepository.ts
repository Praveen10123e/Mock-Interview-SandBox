import { PrismaClient, Profile, Prisma } from '../generated/client';
import { BaseRepository } from '@nm/api-base';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class ProfileRepository extends BaseRepository<
  Profile,
  Prisma.ProfileCreateInput,
  Prisma.ProfileUpdateInput
> {
  async findById(id: string): Promise<Profile | null> {
    return prisma.profile.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        facultyProfile: true,
        adminProfile: true,
        careerProfile: true,
        aiPreferences: true,
        interviewPreference: true,
        nmProfile: true,
        socialLinks: true,
        metrics: true,
        education: true,
        skills: { include: { skill: { include: { category: true } } } },
        resumes: true,
      },
    });
  }

  async findByIdentityId(identityId: string): Promise<Profile | null> {
    return prisma.profile.findUnique({
      where: { identityId },
      include: {
        studentProfile: true,
        facultyProfile: true,
        adminProfile: true,
        careerProfile: true,
        aiPreferences: true,
        interviewPreference: true,
        nmProfile: true,
        socialLinks: true,
        metrics: true,
        education: true,
        skills: { include: { skill: { include: { category: true } } } },
        resumes: true,
      },
    });
  }

  async findAll(options?: any): Promise<Profile[]> {
    return prisma.profile.findMany(options);
  }

  async create(data: Prisma.ProfileCreateInput): Promise<Profile> {
    return prisma.profile.create({ data });
  }

  async update(id: string, data: Prisma.ProfileUpdateInput): Promise<Profile> {
    return prisma.profile.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.profile.delete({ where: { id } });
    return true;
  }
}
