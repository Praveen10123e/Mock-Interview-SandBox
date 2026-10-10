const fs = require('fs');
const path = require('path');

const packages = [
  'monitoring',
  'utils',
  'validation',
  'feature-flags',
  'prompts/interviewer',
  'prompts/evaluator',
  'prompts/explainability',
  'prompts/recommendation',
  'prompts/system',
  'ai/providers/openai',
  'ai/providers/groq',
  'ai/providers/gemini',
  'ai/providers/stt',
  'ai/providers/tts',
  'ai/providers/embeddings'
];

function scaffold(pkgPath) {
  const fullPath = path.join(__dirname, '../packages', pkgPath);
  
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }

  const pkgJsonPath = path.join(fullPath, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    // Generate valid scoped name (e.g., @nm/prompts-interviewer)
    const name = '@nm/' + pkgPath.replace(/\//g, '-');
    fs.writeFileSync(pkgJsonPath, JSON.stringify({
      name,
      version: '1.0.0',
      main: 'src/index.ts',
      scripts: {
        build: 'tsc'
      },
      dependencies: {},
      devDependencies: {}
    }, null, 2));
  }

  const srcDir = path.join(fullPath, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  const indexTs = path.join(srcDir, 'index.ts');
  if (!fs.existsSync(indexTs)) {
    fs.writeFileSync(indexTs, `// Export for ${pkgPath}\n`);
  }

  // Calculate depth to determine tsconfig extends path
  // If pkgPath contains a slash (e.g., "prompts/system"), depth is 3. Else 2.
  const depth = pkgPath.split('/').length + 1; // root/packages = 1, pkg = +1 = 2
  const tsconfigPath = path.join(fullPath, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    const prefix = '../'.repeat(depth);
    fs.writeFileSync(tsconfigPath, JSON.stringify({
      extends: `${prefix}tsconfig.json`,
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src"
      },
      include: ["src/**/*"]
    }, null, 2));
  }
}

packages.forEach(pkg => scaffold(pkg));

console.log('Scaffolding packages complete.');
