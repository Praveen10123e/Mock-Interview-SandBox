import { PrismaClient } from './src/generated/client';
import bcrypt from 'bcryptjs';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const role = await prisma.role.upsert({
    where: { name: 'STUDENT' },
    update: {},
    create: { name: 'STUDENT' },
  });

  await prisma.identity.upsert({
    where: { email: 'student@example.com' },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      email: 'student@example.com',
      passwordHash: hashedPassword,
      status: 'ACTIVE',
      roles: {
        create: {
          roleId: role.id,
        },
      },
    },
  });

  console.log('Successfully seeded student@example.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
