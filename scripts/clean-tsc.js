const fs = require('fs');
const path = require('path');

function cleanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === 'dist' || item === '.git') continue;
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      cleanDir(fullPath);
    } else {
      if ((item.endsWith('.ts') && !item.endsWith('.d.ts')) || item.endsWith('.tsx')) {
        const base = item.replace(/\.tsx?$/, '');
        const toDelete = [
          base + '.js',
          base + '.js.map',
          base + '.d.ts',
          base + '.d.ts.map'
        ];
        toDelete.forEach(ext => {
          const delPath = path.join(dir, ext);
          if (fs.existsSync(delPath)) {
            fs.unlinkSync(delPath);
            console.log('Deleted', delPath);
          }
        });
      }
    }
  }
}

cleanDir(path.join(__dirname, '../apps'));
cleanDir(path.join(__dirname, '../packages'));
