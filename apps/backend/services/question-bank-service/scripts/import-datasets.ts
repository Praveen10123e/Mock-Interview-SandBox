import fs from 'fs';
import path from 'path';
import { ImportService } from '../src/services/ImportService';

async function main() {
  const datasetDir = path.resolve(__dirname, '../../../../../data-engineering/dataset');
  if (!fs.existsSync(datasetDir)) {
    console.error(`Dataset directory not found at: ${datasetDir}`);
    process.exit(1);
  }

  // Parse arguments to see if a specific dataset was requested (e.g. -- python)
  const args = process.argv.slice(2);
  let specificDataset = '';
  if (args.length > 0) {
    const datasetArgIndex = args.findIndex(arg => arg === '--') + 1;
    if (datasetArgIndex > 0 && datasetArgIndex < args.length) {
      specificDataset = args[datasetArgIndex].toLowerCase();
    } else if (args[0] && !args[0].startsWith('--')) {
      specificDataset = args[0].toLowerCase();
    }
  }

  const files = fs.readdirSync(datasetDir).filter(f => f.endsWith('.json'));
  
  const filesToProcess = specificDataset 
    ? files.filter(f => f.toLowerCase().includes(specificDataset))
    : files;

  if (filesToProcess.length === 0) {
    console.log(`No matching datasets found for: ${specificDataset || 'all'}`);
    process.exit(0);
  }

  console.log(`Found ${filesToProcess.length} dataset(s) to import...`);
  
  for (const file of filesToProcess) {
    console.log(`\n========================================`);
    console.log(`Starting import for: ${file}`);
    const start = Date.now();
    
    try {
      const result = await ImportService.importDataset(path.join(datasetDir, file), file);
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      
      const fileStat = require('fs').statSync(path.join(datasetDir, file));
      const sizeMB = (fileStat.size / (1024 * 1024)).toFixed(2);
      
      console.log(`\nDataset Name: ${file.replace('_dataset.json', '').replace('_interview', '')}`);
      console.log(`${sizeMB}MB`);
      console.log(`${result.totalRecords} Read`);
      console.log(`${result.importedCount} Imported`);
      console.log(`${result.skippedCount} Skipped (Duplicates)`);
      console.log(`${result.failedCount} Failed/Rejected`);
      console.log(`Time Taken: ${elapsed}s`);
    } catch (err: any) {
      console.error(`❌ Failed to import ${file}:`, err.message);
    }
  }
  
  console.log(`\n🎉 All import tasks finished.`);
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
