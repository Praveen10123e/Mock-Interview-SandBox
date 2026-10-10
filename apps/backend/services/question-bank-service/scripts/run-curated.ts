import path from 'path';
import { ImportService } from '../src/services/ImportService';

async function main() {
  const filePath = 'd:/MINI_PROJECT/data/curated/full_program_coding_interview_dataset_40(3).json';
  console.log('Importing curated coding...');
  try {
     const result = await ImportService.importCuratedDataset(filePath, 'full_program_coding_interview_dataset_40(3).json');
     console.log('Result:', result);
  } catch (err) {
     console.error('Import failed:', err);
  }
}
main();
