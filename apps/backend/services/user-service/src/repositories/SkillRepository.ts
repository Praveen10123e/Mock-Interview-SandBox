import { PrismaClient, Skill, Prisma, ProfileSkill, SkillCategory } from '../generated/client';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class SkillRepository {
  async findSkillById(id: string): Promise<Skill | null> {
    return prisma.skill.findUnique({ where: { id }, include: { category: true } });
  }

  async findSkillByName(name: string): Promise<Skill | null> {
    return prisma.skill.findUnique({ where: { name }, include: { category: true } });
  }

  async createSkill(data: Prisma.SkillCreateInput): Promise<Skill> {
    return prisma.skill.create({ data, include: { category: true } });
  }

  async ensureCategory(name: string): Promise<SkillCategory> {
    let category = await prisma.skillCategory.findUnique({ where: { name } });
    if (!category) {
      category = await prisma.skillCategory.create({ data: { name } });
    }
    return category;
  }

  async addSkillToProfile(
    profileId: string,
    skillId: string,
    proficiency?: string,
  ): Promise<ProfileSkill> {
    return prisma.profileSkill.upsert({
      where: {
        profileId_skillId: { profileId, skillId },
      },
      update: { proficiency },
      create: { profileId, skillId, proficiency },
    });
  }

  async removeSkillFromProfile(profileId: string, skillId: string): Promise<void> {
    await prisma.profileSkill.delete({
      where: { profileId_skillId: { profileId, skillId } },
    });
  }
}
