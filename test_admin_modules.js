const http = require('http');

function post(url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers,
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') });
        } catch (e) {
          resolve({ status: res.statusCode, text: buf });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('--- 1. Authenticating Roles ---');
  let adminAuth = await post('http://localhost:3000/api/v1/auth/login', {
    email: 'admin@nm.edu',
    password: 'Password123!'
  });
  if (adminAuth.status !== 200) {
    adminAuth = await post('http://localhost:3000/api/v1/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
  }
  const adminToken = adminAuth.data?.data?.accessToken;
  console.log('Admin login status:', adminAuth.status, 'Token acquired:', !!adminToken);

  const facultyAuth = await post('http://localhost:3000/api/v1/auth/login', {
    email: 'faculty@nm.edu',
    password: 'Password123!'
  });
  const facultyToken = facultyAuth.data?.data?.accessToken;
  console.log('Faculty login status:', facultyAuth.status, 'Token acquired:', !!facultyToken);

  let studentAuth = await post('http://localhost:3000/api/v1/auth/login', {
    email: 'student@example.com',
    password: 'Password123!'
  });
  if (studentAuth.status !== 200) {
    studentAuth = await post('http://localhost:3000/api/v1/auth/login', {
      email: 'student@example.com',
      password: 'password123'
    });
  }
  const studentToken = studentAuth.data?.data?.accessToken;
  console.log('Student login status:', studentAuth.status, 'Token acquired:', !!studentToken);

  console.log('\n--- 2. Testing DATASETS API ---');
  // Admin datasets list
  const datasetsRes = await get('http://localhost:3000/api/v1/questions/datasets', adminToken);
  console.log('GET /questions/datasets (Admin): status =', datasetsRes.status);
  console.log('  Total Datasets:', datasetsRes.data?.data?.summary?.totalDatasets);
  console.log('  Total Questions:', datasetsRes.data?.data?.summary?.totalQuestions);
  console.log('  First dataset:', datasetsRes.data?.data?.datasets?.[0]?.name);

  // Inspect detail of first dataset
  const firstId = datasetsRes.data?.data?.datasets?.[0]?.id;
  if (firstId) {
    const detailRes = await get(`http://localhost:3000/api/v1/questions/datasets/${firstId}`, adminToken);
    console.log(`GET /questions/datasets/${firstId} detail: status =`, detailRes.status);
    console.log('  Dataset Name:', detailRes.data?.data?.dataset?.name);
    console.log('  Questions Returned:', detailRes.data?.data?.questions?.length);
    if (detailRes.data?.data?.questions?.[0]) {
      const q = detailRes.data?.data?.questions[0];
      console.log('  Sample question fields:', Object.keys(q));
      console.log('  Has testCases:', !!q.testCases, 'testCases length:', q.testCases?.length);
      console.log('  Has any hidden/secret fields:', 'hidden_test_cases' in q || 'secret' in q || 'hidden' in q);
    }

    // Test Export
    const exportRes = await get(`http://localhost:3000/api/v1/questions/datasets/${firstId}/export`, adminToken);
    console.log(`GET /questions/datasets/${firstId}/export: status =`, exportRes.status);
    console.log('  Exported count:', exportRes.data?.data?.questions?.length);
    console.log('  Export metadata:', exportRes.data?.data?.metadata);
    const exportStr = JSON.stringify(exportRes.data);
    const hasHiddenInExport = exportStr.includes('hidden_test_cases') || exportStr.includes('"secret":') || exportStr.includes('"password":');
    console.log('  Export safe (no secrets or hidden terminology):', !hasHiddenInExport);
  }

  // Test Validation
  const valRes = await post('http://localhost:3000/api/v1/questions/datasets/validate', {
    questions: [
      {
        title: 'Two Sum Problem',
        description: 'Find two numbers that add up to target',
        questionType: 'CODING',
        difficulty: 'EASY',
        testCases: [
          { input: '[2,7,11,15], target = 9', expectedOutput: '[0,1]' }
        ]
      },
      {
        title: 'Malformed Question',
        // missing description and invalid difficulty
        questionType: 'INVALID_TYPE',
        difficulty: 'SUPER_HARD',
      }
    ]
  }, adminToken);
  console.log('POST /questions/datasets/validate: status =', valRes.status);
  console.log('  Validation summary:', valRes.data?.data?.summary);

  // Datasets Batches
  const batchesRes = await get('http://localhost:3000/api/v1/questions/datasets/batches', adminToken);
  console.log('GET /questions/datasets/batches: status =', batchesRes.status, 'batches count =', batchesRes.data?.data?.length);

  console.log('\n--- 3. Testing SYSTEM HEALTH API ---');
  const systemRes = await get('http://localhost:3000/api/v1/admin/system', adminToken);
  console.log('GET /admin/system (Admin): status =', systemRes.status);
  console.log('  Overall Status:', systemRes.data?.data?.overallStatus);
  console.log('  Services checked:', systemRes.data?.data?.services?.map(s => `${s.name}: ${s.status} (${s.latency})`));
  console.log('  Database Status:', systemRes.data?.data?.database?.status, 'latency:', systemRes.data?.data?.database?.latency);
  console.log('  Redis Status:', systemRes.data?.data?.redis?.status, 'used:', systemRes.data?.data?.redis?.isUsed);

  console.log('\n--- 4. Testing ANALYTICS API ---');
  const analyticsRes = await get('http://localhost:3000/api/v1/admin/analytics?dateRange=all', adminToken);
  console.log('GET /admin/analytics (Admin): status =', analyticsRes.status);
  console.log('  Overview:', analyticsRes.data?.data?.overview);
  console.log('  Verdicts:', analyticsRes.data?.data?.codingAnalytics?.verdictDistribution);
  console.log('  Languages:', analyticsRes.data?.data?.codingAnalytics?.languages);
  console.log('  Proctoring tab switches:', analyticsRes.data?.data?.proctoring?.totalTabSwitches);

  console.log('\n--- 5. Testing RBAC Security ---');
  // Unauthenticated access
  const unauthDatasets = await get('http://localhost:3000/api/v1/questions/datasets');
  console.log('GET /questions/datasets (Unauthenticated): status =', unauthDatasets.status, '(Expected 401)');
  const unauthSystem = await get('http://localhost:3000/api/v1/admin/system');
  console.log('GET /admin/system (Unauthenticated): status =', unauthSystem.status, '(Expected 401)');
  const unauthAnalytics = await get('http://localhost:3000/api/v1/admin/analytics');
  console.log('GET /admin/analytics (Unauthenticated): status =', unauthAnalytics.status, '(Expected 401)');

  // Student access
  const studentDatasets = await get('http://localhost:3000/api/v1/questions/datasets', studentToken);
  console.log('GET /questions/datasets (Student): status =', studentDatasets.status, '(Expected 403)');
  const studentSystem = await get('http://localhost:3000/api/v1/admin/system', studentToken);
  console.log('GET /admin/system (Student): status =', studentSystem.status, '(Expected 403)');
  const studentAnalytics = await get('http://localhost:3000/api/v1/admin/analytics', studentToken);
  console.log('GET /admin/analytics (Student): status =', studentAnalytics.status, '(Expected 403)');

  // Faculty access to admin routes
  const facultySystem = await get('http://localhost:3000/api/v1/admin/system', facultyToken);
  console.log('GET /admin/system (Faculty): status =', facultySystem.status, '(Expected 403)');
  const facultyAnalytics = await get('http://localhost:3000/api/v1/admin/analytics', facultyToken);
  console.log('GET /admin/analytics (Faculty): status =', facultyAnalytics.status, '(Expected 403)');

  console.log('\n--- ALL BACKEND CHECKS COMPLETE ---');
}

main().catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
