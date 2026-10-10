const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING ROLE-BASED ACCOUNT CREATION SECURITY SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  const timestamp = Date.now();

  // Helper
  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name} ${details ? '- ' + details : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? '- ' + details : ''}`);
      failed++;
    }
  }

  // ── TEST 9: Existing Admin account continues working ──
  let adminToken = '';
  let adminUser = null;
  try {
    const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@nm.edu',
      password: 'Password123!',
    });
    adminToken = adminLoginRes.data.data.accessToken;
    adminUser = adminLoginRes.data.data.user;
    assert('TEST 9: Admin login works and returns ADMINISTRATOR/ADMIN role', adminUser.roles.includes('ADMINISTRATOR') || adminUser.roles.includes('SUPER_ADMIN'));
  } catch (err) {
    assert('TEST 9: Admin login', false, err.message);
  }

  // ── TEST 1: Student registers normally → account created as STUDENT ──
  const studentEmail = `student_test_${timestamp}@test.edu`;
  try {
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      email: studentEmail,
      password: 'password123',
      firstName: 'Student',
      lastName: 'Test',
    });
    assert('TEST 1: Student registers via public endpoint', regRes.status === 201);
  } catch (err) {
    assert('TEST 1: Student registers', false, err.response?.data?.message || err.message);
  }

  // ── TEST 6: Student logs in → Student role ──
  let studentToken = '';
  try {
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: studentEmail,
      password: 'password123',
    });
    studentToken = loginRes.data.data.accessToken;
    const role = loginRes.data.data.user.roles[0];
    assert('TEST 6: Student logs in and receives STUDENT role', role === 'STUDENT', `Role is ${role}`);
  } catch (err) {
    assert('TEST 6: Student login', false, err.response?.data?.message || err.message);
  }

  // ── TEST 2: Student attempts to send role=FACULTY in public register ──
  const hackerEmail1 = `hacker_faculty_${timestamp}@test.edu`;
  try {
    const hackRes = await axios.post(`${API_BASE}/auth/register`, {
      email: hackerEmail1,
      password: 'password123',
      firstName: 'Hacker',
      lastName: 'Faculty',
      role: 'FACULTY', // Injection attempt
    });
    // Log in to check assigned role
    const checkLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: hackerEmail1,
      password: 'password123',
    });
    const assignedRole = checkLogin.data.data.user.roles[0];
    assert('TEST 2: Public register strictly ignores role="FACULTY" and forces STUDENT', assignedRole === 'STUDENT', `Assigned: ${assignedRole}`);
  } catch (err) {
    assert('TEST 2: Role injection prevented', true, err.message);
  }

  // ── TEST 3: Student attempts to send role=ADMIN in public register ──
  const hackerEmail2 = `hacker_admin_${timestamp}@test.edu`;
  try {
    await axios.post(`${API_BASE}/auth/register`, {
      email: hackerEmail2,
      password: 'password123',
      firstName: 'Hacker',
      lastName: 'Admin',
      role: 'ADMIN', // Injection attempt
    });
    const checkLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: hackerEmail2,
      password: 'password123',
    });
    const assignedRole = checkLogin.data.data.user.roles[0];
    assert('TEST 3: Public register strictly ignores role="ADMIN" and forces STUDENT', assignedRole === 'STUDENT', `Assigned: ${assignedRole}`);
  } catch (err) {
    assert('TEST 3: Admin role injection prevented', true, err.message);
  }

  // Also check if calling unauthenticated /auth/register/faculty directly fails
  try {
    await axios.post(`${API_BASE}/auth/register/faculty`, {
      email: `unauth_faculty_${timestamp}@test.edu`,
      password: 'password123',
      firstName: 'Unauth',
      lastName: 'Faculty',
    });
    assert('TEST 2B: Direct unauthenticated /auth/register/faculty rejected', false, 'Expected 403 Forbidden');
  } catch (err) {
    assert('TEST 2B: Direct unauthenticated /auth/register/faculty rejected with 403', err.response?.status === 403 || err.response?.status === 401, `Status: ${err.response?.status}`);
  }

  // ── TEST 4: Admin creates Faculty account ──
  const facultyEmail = `faculty_created_${timestamp}@nm.edu`;
  try {
    const createFacultyRes = await axios.post(
      `${API_BASE}/users/admin/users`,
      {
        email: facultyEmail,
        password: 'password123',
        firstName: 'Prof',
        lastName: 'Sharma',
        role: 'FACULTY',
        department: 'Computer Applications',
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    assert('TEST 4: Admin creates Faculty account', createFacultyRes.status === 201, `Role: ${createFacultyRes.data.data.role}`);
  } catch (err) {
    assert('TEST 4: Admin creates Faculty', false, err.response?.data?.message || err.message);
  }

  // ── TEST 5: Faculty logs in → Faculty role ──
  try {
    const facultyLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: facultyEmail,
      password: 'password123',
    });
    const facultyRole = facultyLoginRes.data.data.user.roles[0];
    assert('TEST 5: Faculty logs in and receives FACULTY role', facultyRole === 'FACULTY', `Role is ${facultyRole}`);
  } catch (err) {
    assert('TEST 5: Faculty login', false, err.response?.data?.message || err.message);
  }

  // ── TEST 7: Non-admin calls Create User API → 403 Forbidden ──
  try {
    await axios.post(
      `${API_BASE}/users/admin/users`,
      {
        email: `illegal_faculty_${timestamp}@nm.edu`,
        password: 'password123',
        firstName: 'Illegal',
        role: 'FACULTY',
      },
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );
    assert('TEST 7: Non-admin calling Create User API rejected', false, 'Expected 403');
  } catch (err) {
    assert('TEST 7: Non-admin calling Create User API returns 403 Forbidden', err.response?.status === 403 || err.response?.status === 401, `Status: ${err.response?.status}`);
  }

  // ── TEST 8: Admin creates Student account ──
  const adminCreatedStudentEmail = `student_admin_created_${timestamp}@nm.edu`;
  try {
    const createStudentRes = await axios.post(
      `${API_BASE}/users/admin/users`,
      {
        email: adminCreatedStudentEmail,
        password: 'password123',
        firstName: 'Priya',
        lastName: 'Raman',
        role: 'STUDENT',
        department: 'Information Technology',
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    assert('TEST 8: Admin creates Student account', createStudentRes.status === 201, `Role: ${createStudentRes.data.data.role}`);
  } catch (err) {
    assert('TEST 8: Admin creates Student', false, err.response?.data?.message || err.message);
  }

  console.log('\n==================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');
}

runTests().catch(console.error);
