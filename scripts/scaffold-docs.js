const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '../docs');
const rootDir = path.join(__dirname, '..');

const folders = [
  'SRS',
  'Architecture',
  'Database',
  'API',
  'UML',
  'Deployment'
];

folders.forEach(f => {
  const p = path.join(docsDir, f);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
});

const filesToMove = [
  { file: 'NM_Mock_Interview_Sandbox_SRS.docx', target: 'SRS' },
  { file: 'System_Architecture.docx', target: 'Architecture' },
  { file: 'NM_Mock_Interview_Sandbox_Pitch_Deck.pptx', target: 'Architecture' },
  { file: 'NM_Mock_Interview_Sandbox_Project_Documentation.docx', target: 'Architecture' }
];

filesToMove.forEach(item => {
  const source = path.join(rootDir, item.file);
  const dest = path.join(docsDir, item.target, item.file);
  if (fs.existsSync(source)) {
    fs.renameSync(source, dest);
    console.log(`Moved ${item.file} to docs/${item.target}`);
  }
});

console.log('Docs scaffolding complete.');
