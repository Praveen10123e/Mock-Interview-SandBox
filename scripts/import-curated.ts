import path from 'path';
import { ImportService } from '../apps/backend/services/question-bank-service/src/services/ImportService';

async function importCurated() {
  const CURATED_DIR = path.join(__dirname, '../data/curated');
  
  const files = [
    { file: 'full_program_coding_interview_dataset_40(3).json', name: 'Curated - Full-Program Coding Interview Dataset' },
    { file: 'aptitude.json', name: 'Curated Aptitude Set v1' },
    { file: 'hr.json', name: 'Curated HR Set v1' }
  ];

  console.log('--- Starting Curated Dataset Import ---\n');

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const f of files) {
    console.log(`Processing: ${f.file}`);
    const filepath = path.join(CURATED_DIR, f.file);
    try {
      const result = await ImportService.importCuratedDataset(filepath, f.file);
      console.log(`✅ Success for ${f.file}`);
      console.log(`   Imported: ${result.importedCount}`);
      console.log(`   Skipped (Duplicates): ${result.skippedCount}`);
      console.log(`   Failed: ${result.failedCount}\n`);
      
      totalImported += result.importedCount;
      totalSkipped += result.skippedCount;
      totalFailed += result.failedCount;
    } catch (err: any) {
      console.error(`❌ Error importing ${f.file}: ${err.message}`);
    }
  }

  console.log('--- Import Summary ---');
  console.log(`Total New Imported: ${totalImported}`);
  console.log(`Total Skipped (Duplicates): ${totalSkipped}`);
  console.log(`Total Failed: ${totalFailed}`);
  
  if (totalImported + totalSkipped === 45) {
    console.log('✅ Verified 45 Curated Questions are active in the system.');
  }

  process.exit(0);
}

importCurated();
