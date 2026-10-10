const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const services = [
  'apps/frontend',
  'apps/backend/gateway',
  'apps/backend/services/user-service',
  'apps/backend/services/auth-service',
  'apps/backend/services/interview-service',
  'apps/backend/services/judge-service',
  'apps/backend/services/question-bank-service'
];

services.forEach(service => {
  const pkgPath = path.join(__dirname, service, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.scripts && pkg.scripts.dev) {
      console.log(`Starting dev server for ${service}...`);
      const child = spawn('npm', ['run', 'dev', '-w', pkg.name], {
        stdio: 'pipe',
        shell: true
      });
      
      child.stdout.on('data', data => process.stdout.write(`[${pkg.name}] ${data}`));
      child.stderr.on('data', data => process.stderr.write(`[${pkg.name} ERROR] ${data}`));
    }
  }
});
