const fs = require('fs');
const path = require('path');

const dockerDir = path.join(__dirname, '../docker');

const folders = [
  'development',
  'production',
  'nginx'
];

folders.forEach(f => {
  const p = path.join(dockerDir, f);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
});

console.log('Docker scaffolding complete.');
