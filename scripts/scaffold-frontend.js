const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../apps/frontend/src');

const folders = [
  'api',
  'assets',
  'components/common',
  'components/ui',
  'components/interview',
  'components/dashboard',
  'components/charts',
  'contexts',
  'hooks',
  'layouts',
  'pages',
  'routes',
  'services',
  'store',
  'styles',
  'types',
  'utils'
];

folders.forEach(f => {
  const p = path.join(srcDir, f);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
});

// Move lib/utils.ts to utils/index.ts
const oldUtils = path.join(srcDir, 'lib/utils.ts');
const newUtils = path.join(srcDir, 'utils/index.ts');
if (fs.existsSync(oldUtils)) {
  fs.renameSync(oldUtils, newUtils);
  // attempt to remove lib if empty
  try { fs.rmdirSync(path.join(srcDir, 'lib')); } catch (e) {}
}

// Move index.css to styles/index.css
const oldCss = path.join(srcDir, 'index.css');
const newCss = path.join(srcDir, 'styles/index.css');
if (fs.existsSync(oldCss)) {
  fs.renameSync(oldCss, newCss);
}

// Update main.tsx imports
const mainTsx = path.join(srcDir, 'main.tsx');
if (fs.existsSync(mainTsx)) {
  let content = fs.readFileSync(mainTsx, 'utf8');
  content = content.replace(/import '.\/index.css';/, "import './styles/index.css';");
  fs.writeFileSync(mainTsx, content);
}

// Update components.json
const compJson = path.join(__dirname, '../apps/frontend/components.json');
if (fs.existsSync(compJson)) {
  let content = fs.readFileSync(compJson, 'utf8');
  content = content.replace(/"css": "src\/index.css"/, '"css": "src/styles/index.css"');
  content = content.replace(/"utils": "@\/lib\/utils"/, '"utils": "@/utils/index"');
  fs.writeFileSync(compJson, content);
}

console.log('Frontend scaffolding complete.');
