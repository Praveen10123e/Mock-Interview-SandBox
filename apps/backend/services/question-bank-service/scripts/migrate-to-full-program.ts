import { PrismaClient } from '../src/generated/client';
import { ImportService } from '../src/services/ImportService';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Migration to Full-Program Coding Interview Dataset ---');

  // 1. Find and purge old curated coding questions
  const oldCodingQuestions = await prisma.question.findMany({
    where: {
      questionType: 'CODING',
      source: {
        name: { in: ['Curated Coding Set v1', 'Curated - Full-Program Coding Interview Dataset'] },
      },
    },
    select: { id: true, title: true },
  });

  console.log(`Found ${oldCodingQuestions.length} existing curated coding questions to purge.`);

  if (oldCodingQuestions.length > 0) {
    const ids = oldCodingQuestions.map((q) => q.id);

    // Delete related child rows first
    await prisma.questionExample.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.questionConstraint.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.questionHint.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.questionMetadata.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.question.deleteMany({ where: { id: { in: ids } } });

    console.log(`Purged ${oldCodingQuestions.length} old curated coding questions.`);
  }

  // 2. Import the new 40-question dataset
  const datasetPath = path.resolve(__dirname, '../../../../../data/curated/full_program_coding_interview_dataset_40(3).json');
  console.log(`Importing new dataset from: ${datasetPath}`);

  const result = await ImportService.importCuratedDataset(datasetPath, 'full_program_coding_interview_dataset_40(3).json');

  console.log('\n--- Import Results ---');
  console.log(`Batch ID: ${result.batchId}`);
  console.log(`Total Records: ${result.totalRecords}`);
  console.log(`Imported: ${result.importedCount}`);
  console.log(`Skipped (Duplicates): ${result.skippedCount}`);
  console.log(`Failed: ${result.failedCount}`);

  // 3. Verify in database
  const count = await prisma.question.count({
    where: {
      questionType: 'CODING',
      source: {
        name: 'Curated - Full-Program Coding Interview Dataset',
      },
    },
  });

  console.log(`\nVerified ${count} active full-program coding questions in database.`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
