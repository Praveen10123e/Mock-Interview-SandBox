const { PrismaClient } = require(__dirname + '/../apps/backend/services/question-bank-service/src/generated/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const sources = await prisma.questionSource.findMany({ where: { name: { startsWith: 'Curated' } } });
    console.log('Curated Sources:', sources);

    const questions = await prisma.question.groupBy({
      by: ['questionType'],
      where: { source: { name: { startsWith: 'Curated' } } },
      _count: true
    });
    console.log('Curated Questions Count:', questions);
    
    const apt = await prisma.question.findFirst({
      where: { source: { name: { startsWith: 'Curated' } }, questionType: 'APTITUDE' },
      include: { metadata: true, explanations: true, source: true }
    });
    console.log('\nAPT-01 Raw DB record:', JSON.stringify(apt, null, 2));

    const hr = await prisma.question.findFirst({
      where: { source: { name: { startsWith: 'Curated' } }, questionType: 'HR' },
      include: { metadata: true, explanations: true, source: true }
    });
    console.log('\nHR-01 Raw DB record:', JSON.stringify(hr, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
