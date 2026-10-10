const path = require('path');
const axios = require('axios');
const { PrismaClient } = require(path.resolve(__dirname, '../apps/backend/services/interview-service/src/generated/client'));
const prisma = new PrismaClient();

const GATEWAY_URL = 'http://localhost:3000/api/v1';
const IDENTITY_ID = '4f3ed36c-5eb0-4b9b-b6f0-0a3848da0e21'; // student

async function runTests() {
  console.log('================================================================');
  console.log('STARTING CODING RUN VS SUBMIT BEHAVIOR VALIDATION');
  console.log('================================================================\n');

  // 0. Authenticate student to obtain valid JWT Bearer token
  console.log('Authenticating student via Gateway...');
  const loginRes = await axios.post(`${GATEWAY_URL}/auth/login`, {
    email: 'student@example.com',
    password: 'Password123!'
  });
  const studentToken = loginRes.data.data.accessToken;
  const identityId = loginRes.data.data.user.id;
  const headers = {
    Authorization: `Bearer ${studentToken}`,
    'x-identity-id': identityId,
  };
  console.log(`Authenticated as student ${identityId}\n`);

  // 1. Create a dedicated test interview and session
  const crypto = require('crypto');
  const testInterviewId = crypto.randomUUID();
  const testSessionId = crypto.randomUUID();

  console.log(`Setting up test interview ${testInterviewId}...`);
  await prisma.interview.create({
    data: {
      id: testInterviewId,
      title: 'Full Stack Coding Evaluation',
      interviewType: 'TECHNICAL',
      difficulty: 'MEDIUM',
      identityId: identityId,
      state: 'RUNNING',
    },
  });

  await prisma.interviewSession.create({
    data: {
      id: testSessionId,
      interviewId: testInterviewId,
      startedAt: new Date(),
    },
  });

  const q1Id = '6be58627-e56c-4407-931c-0b4fe5d118a1'; // Longest Positive-Sum Segment (4 test cases)
  const q2Id = 'd8df61e5-3fda-4072-a0db-26f6e902c16e'; // K Smallest Values (4 test cases)

  await prisma.interviewRoundAssignment.createMany({
    data: [
      { interviewId: testInterviewId, questionId: q1Id, questionRefId: q1Id, round: 'CODING', position: 0 },
      { interviewId: testInterviewId, questionId: q2Id, questionRefId: q2Id, round: 'CODING', position: 1 },
    ],
  });

  // Solutions for Longest Positive-Sum Segment (Language 71 = Python)
  // Correct solution for all 4 tests:
  const pythonFullSolutionQ1 = `
import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    a = [int(x) for x in lines[1:1+n]]
    if a == [-2, 3, -1, 2, -5, 4]:
        print(4)
    elif a == [-1, -2, -3, -4, -5]:
        print(0)
    elif a == [1, -1, 0, 0, -1]:
        print(4)
    elif a == [-5, 2, -1, 2, -1, 2, -10]:
        print(5)
    else:
        print(0)
`;

  // Partial solution that passes only test 1 and test 2:
  // Test 1: input "6\n-2 3 -1 2 -5 4" -> expected "4"
  // Test 2: input "5\n-1 -2 -3 -4 -5" -> expected "0"
  // Test 3: input "5\n1 -1 0 0 -1" -> expected "4"
  // Test 4: input "7\n-5 2 -1 2 -1 2 -10" -> expected "5"
  const pythonPartialSolutionQ1 = `
import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    a = [int(x) for x in lines[1:1+n]]
    if a == [-2, 3, -1, 2, -5, 4]:
        print(4)
    elif a == [-1, -2, -3, -4, -5]:
        print(0)
    else:
        print(999) # Will fail test 3 and 4
`;

  // Solution that fails all tests:
  const pythonFailingSolutionQ1 = `
print("WRONG_OUTPUT_ALL_FAIL")
`;

  // Solution for K Smallest Values (Language 71 = Python)
  // Input: N and K followed by N integers. Output: K smallest values in ascending order.
  const pythonFullSolutionQ2 = `
import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    k = int(lines[1])
    a = [int(x) for x in lines[2:2+n]]
    a.sort()
    print(" ".join(str(x) for x in a[:k]))
`;

  try {
    // -------------------------------------------------------------
    // TEST 1: RUN CODE ON 4 VISIBLE TEST CASES
    // -------------------------------------------------------------
    console.log('--- TEST 1: RUN CODE on "Longest Positive-Sum Segment" ---');
    const run1Res = await axios.post(
      `${GATEWAY_URL}/interviews/${testInterviewId}/run`,
      {
        questionRefId: q1Id,
        languageId: 71,
        sourceCode: pythonFullSolutionQ1,
        runMode: 'RUN',
      },
      { headers }
    );

    console.log('RUN 1 Results Detail:', JSON.stringify(run1Res.data.results, null, 2));

    if (run1Res.data.totalCount !== 2 || run1Res.data.results?.length !== 2) {
      throw new Error(`FAIL: RUN must execute exactly 2 test cases! Got totalCount=${run1Res.data.totalCount}, resultsCount=${run1Res.data.results?.length}`);
    }
    if (run1Res.data.passedCount !== 2) {
      throw new Error(`FAIL: Expected 2/2 passed on RUN, got ${run1Res.data.passedCount}/2`);
    }

    // Verify persistence: NO attempts should exist
    const attemptsAfterRun = await prisma.interviewExecutionRecord.findMany({
      where: { sessionId: testSessionId },
    });
    console.log(`Execution records in DB after RUN: ${attemptsAfterRun.length}`);
    if (attemptsAfterRun.length !== 0) {
      throw new Error(`FAIL: RUN must NOT create any execution records in DB! Found ${attemptsAfterRun.length}`);
    }

    // Verify question result in DB: NOT created or modified by RUN
    const qResultAfterRun = await prisma.interviewQuestionResult.findUnique({
      where: { sessionId_questionRefId: { sessionId: testSessionId, questionRefId: q1Id } },
    });
    if (qResultAfterRun !== null) {
      throw new Error(`FAIL: RUN must NOT affect interviewQuestionResult! Found ${JSON.stringify(qResultAfterRun)}`);
    }
    console.log('✓ TEST 1 PASSED: RUN executed exactly 2/2 test cases and did NOT persist any attempt.\n');

    // -------------------------------------------------------------
    // TEST 2: RUN vs SUBMIT WITH PARTIAL SOLUTION (First 2 pass, last 2 fail)
    // -------------------------------------------------------------
    console.log('--- TEST 2: First 2 pass, last 2 fail ---');
    const run2Res = await axios.post(
      `${GATEWAY_URL}/interviews/${testInterviewId}/run`,
      {
        questionRefId: q1Id,
        languageId: 71,
        sourceCode: pythonPartialSolutionQ1,
        runMode: 'RUN',
      },
      { headers }
    );
    console.log('RUN (Partial) Result:', `${run2Res.data.passedCount} / ${run2Res.data.totalCount} Test Cases Passed`);
    if (run2Res.data.passedCount !== 2 || run2Res.data.totalCount !== 2) {
      throw new Error(`FAIL: Expected 2/2 passed for RUN on partial solution, got ${run2Res.data.passedCount}/${run2Res.data.totalCount}`);
    }

    // Now SUBMIT the partial solution:
    const submit1Res = await axios.post(
      `${GATEWAY_URL}/interviews/${testInterviewId}/submit`,
      {
        questionRefId: q1Id,
        languageId: 71,
        sourceCode: pythonPartialSolutionQ1,
        runMode: 'SUBMIT',
      },
      { headers }
    );
    console.log('SUBMIT 1 (Partial) Result:', `${submit1Res.data.passedCount} / ${submit1Res.data.totalCount} Test Cases Passed`);
    if (submit1Res.data.passedCount !== 2 || submit1Res.data.totalCount !== 4) {
      throw new Error(`FAIL: Expected 2/4 passed for SUBMIT on partial solution, got ${submit1Res.data.passedCount}/${submit1Res.data.totalCount}`);
    }

    // Verify persistence: exactly 1 attempt recorded (Attempt #1)
    const attemptsAfterSub1 = await prisma.interviewExecutionRecord.findMany({
      where: { sessionId: testSessionId, questionRefId: q1Id },
      orderBy: { attemptNumber: 'asc' },
    });
    console.log(`Official attempts in DB: ${attemptsAfterSub1.length}`);
    if (attemptsAfterSub1.length !== 1) {
      throw new Error(`FAIL: Expected exactly 1 attempt after SUBMIT, got ${attemptsAfterSub1.length}`);
    }
    if (attemptsAfterSub1[0].attemptNumber !== 1 || attemptsAfterSub1[0].passedCount !== 2 || attemptsAfterSub1[0].totalCount !== 4) {
      throw new Error(`FAIL: Attempt 1 details mismatch: ${JSON.stringify(attemptsAfterSub1[0])}`);
    }

    // Check Best Result in interviewQuestionResult: 2/4
    const qResultSub1 = await prisma.interviewQuestionResult.findUnique({
      where: { sessionId_questionRefId: { sessionId: testSessionId, questionRefId: q1Id } },
    });
    console.log('Best Result in DB after Submit 1:', `${qResultSub1?.passedCount} / ${qResultSub1?.totalCount}`);
    if (qResultSub1?.passedCount !== 2 || qResultSub1?.totalCount !== 4) {
      throw new Error(`FAIL: Best Result expected 2/4, got ${qResultSub1?.passedCount}/${qResultSub1?.totalCount}`);
    }
    console.log('✓ TEST 2 PASSED: Run showed 2/2, Submit showed 2/4, Attempt #1 recorded as 2/4.\n');

    // -------------------------------------------------------------
    // TEST 3: RUN vs SUBMIT WITH FAILING SOLUTION (First 2 fail)
    // -------------------------------------------------------------
    console.log('--- TEST 3: First 2 fail ---');
    const run3Res = await axios.post(
      `${GATEWAY_URL}/interviews/${testInterviewId}/run`,
      {
        questionRefId: q1Id,
        languageId: 71,
        sourceCode: pythonFailingSolutionQ1,
        runMode: 'RUN',
      },
      { headers }
    );
    console.log('RUN (Failing) Result:', `${run3Res.data.passedCount} / ${run3Res.data.totalCount} Test Cases Passed`);
    if (run3Res.data.passedCount !== 0 || run3Res.data.totalCount !== 2) {
      throw new Error(`FAIL: Expected 0/2 passed for RUN on failing solution, got ${run3Res.data.passedCount}/${run3Res.data.totalCount}`);
    }

    // SUBMIT the failing solution (0/4 passed)
    const submit2Res = await axios.post(
      `${GATEWAY_URL}/interviews/${testInterviewId}/submit`,
      {
        questionRefId: q1Id,
        languageId: 71,
        sourceCode: pythonFailingSolutionQ1,
        runMode: 'SUBMIT',
      },
      { headers }
    );
    console.log('SUBMIT 2 (Failing) Result:', `${submit2Res.data.passedCount} / ${submit2Res.data.totalCount} Test Cases Passed`);
    if (submit2Res.data.passedCount !== 0 || submit2Res.data.totalCount !== 4) {
      throw new Error(`FAIL: Expected 0/4 passed for SUBMIT on failing solution, got ${submit2Res.data.passedCount}/${submit2Res.data.totalCount}`);
    }

    // Check Best Result in DB: 0 < 2, so Best Result MUST REMAIN 2/4 (Attempt 1)!
    const qResultSub2 = await prisma.interviewQuestionResult.findUnique({
      where: { sessionId_questionRefId: { sessionId: testSessionId, questionRefId: q1Id } },
    });
    console.log('Best Result in DB after Submit 2 (0/4):', `${qResultSub2?.passedCount} / ${qResultSub2?.totalCount}`);
    if (qResultSub2?.passedCount !== 2 || qResultSub2?.totalCount !== 4) {
      throw new Error(`FAIL: Best Result was overwritten by a worse attempt! Expected 2/4, got ${qResultSub2?.passedCount}/${qResultSub2?.totalCount}`);
    }
    console.log('✓ TEST 3 PASSED: Run showed 0/2, Submit showed 0/4, Best Result correctly preserved at 2/4.\n');

    // -------------------------------------------------------------
    // TEST 4: ALL TESTS PASS (4/4)
    // -------------------------------------------------------------
    console.log('--- TEST 4: All tests pass ---');
    const run4Res = await axios.post(
      `${GATEWAY_URL}/interviews/${testInterviewId}/run`,
      {
        questionRefId: q1Id,
        languageId: 71,
        sourceCode: pythonFullSolutionQ1,
        runMode: 'RUN',
      },
      { headers }
    );
    console.log('RUN (Full) Result:', `${run4Res.data.passedCount} / ${run4Res.data.totalCount} Test Cases Passed`);
    if (run4Res.data.passedCount !== 2 || run4Res.data.totalCount !== 2) {
      throw new Error(`FAIL: Expected 2/2 passed for RUN on full solution, got ${run4Res.data.passedCount}/${run4Res.data.totalCount}`);
    }

    const submit3Res = await axios.post(
      `${GATEWAY_URL}/interviews/${testInterviewId}/submit`,
      {
        questionRefId: q1Id,
        languageId: 71,
        sourceCode: pythonFullSolutionQ1,
        runMode: 'SUBMIT',
      },
      { headers }
    );
    console.log('SUBMIT 3 (Full) Result:', `${submit3Res.data.passedCount} / ${submit3Res.data.totalCount} Test Cases Passed`);
    if (submit3Res.data.passedCount !== 4 || submit3Res.data.totalCount !== 4) {
      throw new Error(`FAIL: Expected 4/4 passed for SUBMIT on full solution, got ${submit3Res.data.passedCount}/${submit3Res.data.totalCount}`);
    }

    // Check Best Result in DB: 4 > 2, so Best Result MUST UPDATE to 4/4!
    const qResultSub3 = await prisma.interviewQuestionResult.findUnique({
      where: { sessionId_questionRefId: { sessionId: testSessionId, questionRefId: q1Id } },
    });
    console.log('Best Result in DB after Submit 3 (4/4):', `${qResultSub3?.passedCount} / ${qResultSub3?.totalCount}`);
    if (qResultSub3?.passedCount !== 4 || qResultSub3?.totalCount !== 4) {
      throw new Error(`FAIL: Best Result expected 4/4, got ${qResultSub3?.passedCount}/${qResultSub3?.totalCount}`);
    }
    console.log('✓ TEST 4 PASSED: Run showed 2/2, Submit showed 4/4, Best Result updated to 4/4.\n');

    // -------------------------------------------------------------
    // TEST 5: K SMALLEST VALUES REGRESSION TEST (No 0/0 test cases)
    // -------------------------------------------------------------
    console.log('--- TEST 5: K Smallest Values regression test ---');
    const runQ2Res = await axios.post(
      `${GATEWAY_URL}/interviews/${testInterviewId}/run`,
      {
        questionRefId: q2Id,
        languageId: 71,
        sourceCode: pythonFullSolutionQ2,
        runMode: 'RUN',
      },
      { headers }
    );
    console.log('K Smallest Values RUN Result:', `${runQ2Res.data.passedCount} / ${runQ2Res.data.totalCount} Test Cases Passed`);
    if (runQ2Res.data.totalCount === 0) {
      throw new Error('FAIL: REGRESSION DETECTED! K Smallest Values showed 0 total test cases on RUN!');
    }
    if (runQ2Res.data.totalCount !== 2 || runQ2Res.data.passedCount !== 2) {
      throw new Error(`FAIL: Expected 2/2 passed for K Smallest Values on RUN, got ${runQ2Res.data.passedCount}/${runQ2Res.data.totalCount}`);
    }

    const submitQ2Res = await axios.post(
      `${GATEWAY_URL}/interviews/${testInterviewId}/submit`,
      {
        questionRefId: q2Id,
        languageId: 71,
        sourceCode: pythonFullSolutionQ2,
        runMode: 'SUBMIT',
      },
      { headers }
    );
    console.log('K Smallest Values SUBMIT Result:', `${submitQ2Res.data.passedCount} / ${submitQ2Res.data.totalCount} Test Cases Passed`);
    if (submitQ2Res.data.totalCount !== 4 || submitQ2Res.data.passedCount !== 4) {
      throw new Error(`FAIL: Expected 4/4 passed for K Smallest Values on SUBMIT, got ${submitQ2Res.data.passedCount}/${submitQ2Res.data.totalCount}`);
    }
    console.log('✓ TEST 5 PASSED: K Smallest Values executed 2/2 on Run and 4/4 on Submit. No 0/0 regression.\n');

    // -------------------------------------------------------------
    // TEST 6: REFRESH AFTER SUBMISSION (Session State)
    // -------------------------------------------------------------
    console.log('--- TEST 6: Refresh State after submission ---');
    const stateRes = await axios.get(`${GATEWAY_URL}/interviews/${testInterviewId}/state`, { headers });
    const codingState = stateRes.data.data?.coding;
    const q1State = codingState?.problems?.[q1Id];
    const q2State = codingState?.problems?.[q2Id];

    console.log('Q1 State on Refresh:', {
      hasSubmitted: q1State?.hasSubmitted,
      attemptsCount: q1State?.attemptsCount,
      testsPassed: q1State?.testsPassed,
      totalTests: q1State?.totalTests,
    });
    console.log('Q2 State on Refresh:', {
      hasSubmitted: q2State?.hasSubmitted,
      attemptsCount: q2State?.attemptsCount,
      testsPassed: q2State?.testsPassed,
      totalTests: q2State?.totalTests,
    });

    if (q1State?.attemptsCount !== 3) {
      throw new Error(`FAIL: Expected exactly 3 official submit attempts for Q1, got ${q1State?.attemptsCount}`);
    }
    if (q1State?.testsPassed !== 4 || q1State?.totalTests !== 4) {
      throw new Error(`FAIL: Expected Best Result 4/4 on refresh for Q1, got ${q1State?.testsPassed}/${q1State?.totalTests}`);
    }
    if (q2State?.attemptsCount !== 1) {
      throw new Error(`FAIL: Expected exactly 1 official submit attempt for Q2, got ${q2State?.attemptsCount}`);
    }
    if (q2State?.testsPassed !== 4 || q2State?.totalTests !== 4) {
      throw new Error(`FAIL: Expected Best Result 4/4 on refresh for Q2, got ${q2State?.testsPassed}/${q2State?.totalTests}`);
    }
    console.log('✓ TEST 6 PASSED: Session state reflects deterministic Best Results (4/4) and strictly official submission count.\n');

    // -------------------------------------------------------------
    // TEST 7: ATTEMPTS HISTORY API
    // -------------------------------------------------------------
    console.log('--- TEST 7: Attempts History endpoint ---');
    const historyRes = await axios.get(`${GATEWAY_URL}/interviews/${testInterviewId}/coding/attempts/${q1Id}`, { headers });
    const history = historyRes.data.data || [];
    console.log(`Attempts returned by history API for Q1: ${history.length}`);
    history.forEach((att, idx) => {
      console.log(`  Attempt #${att.attemptNumber || idx+1}: ${att.runMode} | ${att.passedCount}/${att.totalCount} passed | status=${att.status}`);
    });

    if (history.length !== 3) {
      throw new Error(`FAIL: Expected exactly 3 attempts in history for Q1, got ${history.length}`);
    }
    if (history.some(a => a.runMode !== 'SUBMIT')) {
      throw new Error('FAIL: Non-SUBMIT records found in attempt history!');
    }
    console.log('✓ TEST 7 PASSED: Only official SUBMIT attempts appear in history.\n');

    // -------------------------------------------------------------
    // TEST 8: BEST RESULT DETERMINISTIC TIE-BREAKER (Latest attempt wins ties)
    // -------------------------------------------------------------
    console.log('--- TEST 8: Deterministic Tie-Breaker ---');
    // Submit another solution that gets 4/4. It should become Attempt #4 and win the tie!
    const submit4Res = await axios.post(
      `${GATEWAY_URL}/interviews/${testInterviewId}/submit`,
      {
        questionRefId: q1Id,
        languageId: 71,
        sourceCode: pythonFullSolutionQ1 + '\n# Extra comment for tie breaker',
        runMode: 'SUBMIT',
      },
      { headers }
    );
    console.log('SUBMIT 4 (Tie-breaker 4/4) Result:', `${submit4Res.data.passedCount} / ${submit4Res.data.totalCount}`);

    const qResultSub4 = await prisma.interviewQuestionResult.findUnique({
      where: { sessionId_questionRefId: { sessionId: testSessionId, questionRefId: q1Id } },
    });
    const latestSubmitRecord = await prisma.interviewExecutionRecord.findFirst({
      where: { sessionId: testSessionId, questionRefId: q1Id, attemptNumber: 4 },
    });

    console.log('Best Record ID in interviewQuestionResult:', qResultSub4?.latestSubmitRecordId);
    console.log('Attempt 4 Record ID:', latestSubmitRecord?.id);

    if (qResultSub4?.latestSubmitRecordId !== latestSubmitRecord?.id) {
      throw new Error('FAIL: Latest attempt did NOT win tie-breaker in Best Result!');
    }
    console.log('✓ TEST 8 PASSED: Latest attempt wins ties deterministically.\n');

    console.log('================================================================');
    console.log('ALL 8 INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('================================================================');

  } finally {
    // Cleanup test records
    await prisma.interviewRoundAssignment.deleteMany({ where: { interviewId: testInterviewId } }).catch(() => {});
    await prisma.interviewExecutionRecord.deleteMany({ where: { sessionId: testSessionId } }).catch(() => {});
    await prisma.interviewQuestionResult.deleteMany({ where: { sessionId: testSessionId } }).catch(() => {});
    await prisma.interviewSession.deleteMany({ where: { id: testSessionId } }).catch(() => {});
    await prisma.interview.deleteMany({ where: { id: testInterviewId } }).catch(() => {});
    await prisma.$disconnect();
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  if (err.response) {
    console.error('API Error Response:', err.response.data);
  }
  process.exit(1);
});
