const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '../packages');
const backendAppsDir = path.join(__dirname, '../apps/backend/services');

function createTsConfig(dir, depth) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const itemPath = path.join(dir, item);
    if (fs.statSync(itemPath).isDirectory()) {
      const tsconfigPath = path.join(itemPath, 'tsconfig.json');
      const prefix = '../'.repeat(depth);
      const content = {
        extends: `${prefix}tsconfig.json`,
        compilerOptions: {
          outDir: "./dist",
          rootDir: "./src"
        },
        include: ["src/**/*"]
      };
      fs.writeFileSync(tsconfigPath, JSON.stringify(content, null, 2));
      console.log(`Created tsconfig.json in ${itemPath}`);
    }
  }
}

createTsConfig(packagesDir, 2);
createTsConfig(backendAppsDir, 4);
createTsConfig(path.join(__dirname, '../apps/backend'), 3);

