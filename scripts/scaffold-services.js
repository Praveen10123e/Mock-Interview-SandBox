const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '../apps/backend/services');
const gatewayDir = path.join(__dirname, '../apps/backend/gateway');

const services = [
  'auth-service',
  'user-service',
  'interview-service',
  'question-bank-service',
  'judge-service',
  'ai-interview-service',
  'analytics-service',
  'replay-service',
  'scoring-service',
  'recommendation-service',
  'report-service',
  'notification-service',
  'faculty-service',
  'admin-service'
];

function scaffold(baseDir, name) {
  const pkgDir = path.join(baseDir, name);
  const srcDir = path.join(pkgDir, 'src');

  // Core directories
  const dirs = [
    pkgDir,
    srcDir,
    path.join(srcDir, 'config'),
    path.join(srcDir, 'controllers'),
    path.join(srcDir, 'routes'),
    path.join(srcDir, 'services'),
    path.join(srcDir, 'repositories'),
    path.join(srcDir, 'dto'),
    path.join(srcDir, 'middleware'),
    path.join(srcDir, 'validators'),
    path.join(srcDir, 'interfaces'),
    path.join(srcDir, 'utils'),
    path.join(srcDir, 'types'),
    path.join(srcDir, 'events')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const pkgJsonPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    const pkgJson = {
      name: `@nm/${name}`,
      version: "1.0.0",
      main: "src/server.ts",
      scripts: {
        build: "tsc",
        start: "node dist/server.js",
        dev: "ts-node src/server.ts"
      },
      dependencies: {},
      devDependencies: {}
    };
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  }

  const appTsPath = path.join(srcDir, 'app.ts');
  if (!fs.existsSync(appTsPath)) {
    fs.writeFileSync(appTsPath, `import { BaseApplication } from '@nm/api-base';\n\nexport class Application extends BaseApplication {\n  constructor() {\n    super('${name}', '1.0.0');\n  }\n\n  protected initializeRoutes(): void {\n    // Initialize service routes here\n  }\n}\n`);
  }

  const serverTsPath = path.join(srcDir, 'server.ts');
  if (!fs.existsSync(serverTsPath)) {
    fs.writeFileSync(serverTsPath, `import { Application } from './app';\n\nconst app = new Application();\napp.listen();\n`);
  }
  
  const readmePath = path.join(pkgDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, `# ${name}\n\nBackend microservice adhering to the @nm/api-base framework.\n`);
  }
}

// Scaffold all services
services.forEach(svc => scaffold(servicesDir, svc));

// Scaffold gateway
scaffold(path.join(__dirname, '../apps/backend'), 'gateway');

console.log('Scaffolding backend services complete.');
