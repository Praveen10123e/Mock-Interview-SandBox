const http = require('http');

function req(options, bodyData) {
  return new Promise((resolve, reject) => {
    const payload = bodyData ? JSON.stringify(bodyData) : '';
    const headers = { ...(options.headers || {}) };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const request = http.request({ ...options, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}'), raw: data });
        } catch {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('  NM MOCK INTERVIEW SANDBOX - COMPLETE AUDIT TEST   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Health checks on all services
  console.log('--- 1. GATEWAY & SERVICE HEALTH CHECKS ---');
  const services = [
    { name: 'Gateway', port: 3000, path: '/health' },
    { name: 'Auth Service', port: 3001, path: '/health' },
    { name: 'User Service', port: 3002, path: '/health' },
    { name: 'Interview Service', port: 3004, path: '/health' },
    { name: 'Question Bank Service', port: 3005, path: '/health' },
    { name: 'Judge Service', port: 3006, path: '/health' },
  ];

  for (const s of services) {
    const res = await req({ hostname: 'localhost', port: s.port, path: s.path, method: 'GET' });
    assert(res.status === 200, `${s.name} is healthy (HTTP ${res.status})`);
  }

  // 2. Authentication Checks
  console.log('\n--- 2. AUTHENTICATION & TOKEN ACQUISITION ---');
  
  // Student Login
  const studentLogin = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/auth/login', method: 'POST'
  }, { email: 'student@example.com', password: 'Password123!' });
  assert(studentLogin.status === 200 && studentLogin.data?.data?.accessToken, 'Student login successful with JWT');
  const studentToken = studentLogin.data?.data?.accessToken;

  // Faculty Login
  const facultyLogin = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/auth/login', method: 'POST'
  }, { email: 'faculty@nm.edu', password: 'Password123!' });
  assert(facultyLogin.status === 200 && facultyLogin.data?.data?.accessToken, 'Faculty login successful with JWT');
  const facultyToken = facultyLogin.data?.data?.accessToken;

  // Admin Login
  const adminLogin = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/auth/login', method: 'POST'
  }, { email: 'admin@nm.edu', password: 'Password123!' });
  assert(adminLogin.status === 200 && adminLogin.data?.data?.accessToken, 'Admin login successful with JWT');
  const adminToken = adminLogin.data?.data?.accessToken;

  // Invalid Login
  const badLogin = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/auth/login', method: 'POST'
  }, { email: 'student@example.com', password: 'WrongPassword!' });
  assert(badLogin.status === 401, 'Invalid credentials rejected (HTTP 401)');

  // 3. RBAC Verification
  console.log('\n--- 3. ROLE-BASED ACCESS CONTROL (RBAC) ---');
  // Student attempting admin endpoint
  const studentAdminAttempt = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/admin/dashboard', method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(studentAdminAttempt.status === 403, 'Student blocked from Admin Dashboard (HTTP 403)');

  // Faculty attempting admin endpoint
  const facultyAdminAttempt = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/admin/system', method: 'GET',
    headers: { Authorization: `Bearer ${facultyToken}` }
  });
  assert(facultyAdminAttempt.status === 403, 'Faculty blocked from Admin System Health (HTTP 403)');

  // Unauthenticated access
  const unauthAttempt = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/admin/dashboard', method: 'GET'
  });
  assert(unauthAttempt.status === 401, 'Unauthenticated request blocked (HTTP 401)');

  // 4. Student Interview Lifecycle
  console.log('\n--- 4. STUDENT INTERVIEW LIFECYCLE ---');

  // Start Practice Session
  const practiceRes = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/interviews/practice', method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const interviewId = practiceRes.data?.id || practiceRes.data?.interviewId;
  assert(practiceRes.status === 200 && interviewId, `Practice interview created: id=${interviewId}`);

  // Get Session State
  const stateRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/state`, method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const currentStage = stateRes.data?.data?.currentStage;
  assert(stateRes.status === 200 && currentStage, `Interview session state retrieved: currentStage=${currentStage}`);

  // Get Session Questions
  const questionsRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/questions`, method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const aptitudeQuestions = questionsRes.data?.data?.aptitude || [];
  const codingQuestions = questionsRes.data?.data?.coding || [];
  assert(questionsRes.status === 200 && aptitudeQuestions.length > 0, `Aptitude questions locked: count=${aptitudeQuestions.length}`);
  assert(codingQuestions.length > 0, `Coding questions locked: count=${codingQuestions.length}`);

  // Complete Aptitude Round
  const aptitudeAnswers = {};
  aptitudeQuestions.forEach((q, i) => {
    aptitudeAnswers[q.id] = (i % 4); // Mock answers
  });
  const aptCompleteRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/aptitude`, method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  }, { answers: aptitudeAnswers, timeSpentSeconds: 120 });
  assert(aptCompleteRes.status === 200, `Aptitude round completed (HTTP ${aptCompleteRes.status})`);

  // Coding Round: Test RUN
  const codingQ = codingQuestions[0];
  const questionRefId = codingQ?.id;
  const sampleCode = 'import sys\nlines = sys.stdin.read().splitlines()\nif len(lines) >= 2:\n    nums = lines[1].split()\n    print(" ".join(reversed(nums)))\n';

  const runRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/run`, method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  }, {
    questionRefId,
    sourceCode: sampleCode,
    languageId: 71, // Python
    customInput: ''
  });
  assert(runRes.status === 200, `Coding RUN executed successfully (HTTP ${runRes.status})`);

  // Coding Round: Test SUBMIT
  const submitRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/submit`, method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  }, {
    questionRefId,
    sourceCode: sampleCode,
    languageId: 71,
  });
  assert(submitRes.status === 200, `Coding SUBMIT executed and evaluated (HTTP ${submitRes.status})`);

  // Get Attempts History
  const attemptsRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/coding/attempts/${questionRefId}`, method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(attemptsRes.status === 200 && Array.isArray(attemptsRes.data?.data) && attemptsRes.data.data.length >= 1, `Coding attempts history stored and retrieved: attempts=${attemptsRes.data?.data?.length}`);

  // Complete Coding Stage (submit remaining question if any)
  for (let i = 1; i < codingQuestions.length; i++) {
    const q = codingQuestions[i];
    await req({
      hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/submit`, method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    }, {
      questionRefId: q.id,
      sourceCode: sampleCode,
      languageId: 71,
    });
  }

  const completeCodingRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/coding/complete`, method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(completeCodingRes.status === 200, `Coding stage completed successfully (HTTP ${completeCodingRes.status})`);

  // HR Round
  const hrSessionRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/hr/session`, method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  }, { role: 'Software Engineer' });
  assert(hrSessionRes.status === 200, `HR session initialized: status=${hrSessionRes.status}`);

  // Submit HR response
  const hrQuestions = hrSessionRes.data?.data?.questions || [];
  if (hrQuestions.length > 0) {
    await req({
      hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/hr/response`, method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    }, {
      questionId: hrQuestions[0].id,
      transcript: 'I encountered an architectural challenge when designing high-concurrency microservices, which I solved through caching.',
      durationSeconds: 45
    });
  }

  // Complete HR Round
  const hrCompleteRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/hr`, method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(hrCompleteRes.status === 200, `HR stage completed: status=${hrCompleteRes.status}`);

  // Finalize Interview
  const finalizeRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/finalize`, method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(finalizeRes.status === 200, `Interview finalized and report snapshot generated`);

  // Fetch Report Snapshot
  const reportRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/report`, method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const repObj = reportRes.data?.data || reportRes.data || {};
  const score = repObj.overallProficiencyScore ?? repObj.overallScore ?? repObj.score;
  assert(reportRes.status === 200 && score !== undefined && score !== null, `Report snapshot verified: overallProficiencyScore=${score}`);

  // Report Chatbot Query
  const chatRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/report/chat`, method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  }, { message: 'How did I perform in the coding section?' });
  assert(chatRes.status === 200 && chatRes.data?.data, `Report AI intelligence chatbot response verified`);

  // 5. Faculty Flow Verification
  console.log('\n--- 5. FACULTY FLOW VERIFICATION ---');
  const facultyStudentsRes = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/users/faculty/students', method: 'GET',
    headers: { Authorization: `Bearer ${facultyToken}` }
  });
  assert(facultyStudentsRes.status === 200, `Faculty student list accessible (HTTP ${facultyStudentsRes.status})`);

  const facultyReportsRes = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/interviews/faculty/sessions', method: 'GET',
    headers: { Authorization: `Bearer ${facultyToken}` }
  });
  assert(facultyReportsRes.status === 200, `Faculty session list accessible (HTTP ${facultyReportsRes.status})`);

  // 6. Admin Flow Verification
  console.log('\n--- 6. ADMIN FLOW VERIFICATION ---');
  
  // Dashboard
  const adminDash = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/admin/dashboard', method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminDash.status === 200 && adminDash.data?.data, `Admin Dashboard stats loaded (HTTP ${adminDash.status})`);

  // Users
  const adminUsers = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/users/admin/users', method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminUsers.status === 200 && adminUsers.data?.data, `Admin Users management API functional (HTTP ${adminUsers.status})`);

  // Datasets
  const adminDatasets = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/questions/datasets', method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const datasetCount = adminDatasets.data?.data?.datasets?.length || adminDatasets.data?.data?.summary?.totalDatasets;
  assert(adminDatasets.status === 200 && datasetCount > 0, `Admin Datasets source API functional (count=${datasetCount})`);

  // System Health
  const adminSystem = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/admin/system', method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const overallStatus = adminSystem.data?.data?.overallStatus || adminSystem.data?.data?.status;
  assert(adminSystem.status === 200 && overallStatus === 'HEALTHY', `Admin System monitoring functional: overallStatus=${overallStatus}`);

  // Analytics
  const adminAnalytics = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/admin/analytics', method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminAnalytics.status === 200 && adminAnalytics.data?.data?.overview, `Admin Analytics operational: totalInterviews=${adminAnalytics.data?.data?.overview?.totalInterviews}`);

  console.log('\n====================================================');
  console.log(`  AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Audit run failed with unexpected error:', err);
  process.exit(1);
});
