const http = require('http');
const { PrismaClient } = require('../apps/backend/services/interview-service/src/generated/client');
const prisma = new PrismaClient();

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

async function verifyAIAnalysisEndToEnd() {
  console.log('====================================================');
  console.log('  TESTING END-TO-END CODING AI ANALYSIS PIPELINE    ');
  console.log('====================================================\n');

  // 1. Login as student
  const loginRes = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/auth/login', method: 'POST'
  }, { email: 'student@example.com', password: 'Password123!' });

  const token = loginRes.data?.data?.accessToken;
  if (!token) throw new Error('Failed to get student token');
  console.log('1. Student Logged In');

  // 2. Start Practice Session
  const practiceRes = await req({
    hostname: 'localhost', port: 3000, path: '/api/v1/interviews/practice', method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  const interviewId = practiceRes.data?.interviewId || practiceRes.data?.id;
  console.log('2. Created Practice Interview:', interviewId);

  // 3. Complete Aptitude
  await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/aptitude`, method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }, { answers: {} });
  console.log('3. Completed Aptitude Round');

  // 4. Fetch Assigned Questions to get coding question
  const questionsRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/questions`, method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  const codingQuestions = questionsRes.data?.data?.coding || [];
  console.log(`4. Found ${codingQuestions.length} Coding Questions`);
  if (codingQuestions.length === 0) throw new Error('No coding questions assigned');

  const targetQ = codingQuestions[0];
  console.log('   Target Question:', targetQ.id, targetQ.title);

  // 5. Submit candidate code (failing code to test full diagnostic + correction)
  const candidateCode = `import sys
lines = sys.stdin.read().split()
# Candidate incorrect code that just prints 5 4 3 2 1
print("5 4 3 2 1")
`;

  console.log('5. Submitting candidate code...');
  const submitRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/submit`, method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }, {
    questionRefId: targetQ.id,
    sourceCode: candidateCode,
    languageId: 71,
  });

  console.log('   Submit Result:', {
    passed: submitRes.data?.passedCount,
    total: submitRes.data?.totalCount,
    status: submitRes.data?.status || submitRes.data?.statusDescription
  });

  // Submit remaining coding questions
  for (let i = 1; i < codingQuestions.length; i++) {
    await req({
      hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/submit`, method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }, {
      questionRefId: codingQuestions[i].id,
      sourceCode: candidateCode,
      languageId: 71,
    });
  }

  // Complete coding stage
  await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/coding/complete`, method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('6. Completed Coding Stage');

  // Complete HR stage
  await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/hr`, method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('7. Completed HR Stage');

  // 8. Finalize session (Triggers synthesis & AI tutor generation)
  console.log('8. Finalizing session (calling LLM)...');
  const finalizeRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/finalize`, method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('   Finalize Status:', finalizeRes.status);

  // 9. Fetch Final Report
  console.log('9. Fetching Report API...');
  const reportRes = await req({
    hostname: 'localhost', port: 3000, path: `/api/v1/interviews/${interviewId}/report`, method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  const rep = reportRes.data?.data || reportRes.data;
  const codingAnalysis = rep?.stages?.coding?.problems || rep?.codingAnalysis || [];
  console.log(`   Retrieved ${codingAnalysis.length} analyzed coding problems in report.`);

  const prob1 = codingAnalysis[0];
  const attempt1 = prob1?.attempts?.[0];
  const aiAnalysis = attempt1?.aiAnalysis;

  console.log('\n--- VERIFICATION OF AI ANALYSIS ---');
  console.log('Submission ID:', attempt1?.submissionId);
  console.log('AI Status:', aiAnalysis?.status);
  console.log('AI Model:', aiAnalysis?.model);
  console.log('Analysis Version:', aiAnalysis?.analysisVersion);
  console.log('Submission Verdict:', aiAnalysis?.submissionAnalysis?.verdict);
  console.log('Code Explanation:', aiAnalysis?.submissionAnalysis?.codeExplanation?.substring(0, 100) + '...');
  console.log('Optimal Approach:', aiAnalysis?.optimalApproach?.idea?.substring(0, 100) + '...');
  console.log('Correction Root Cause:', aiAnalysis?.correction?.rootCause?.substring(0, 100) + '...');

  // 10. Direct Database Check
  console.log('\n--- DIRECT PRISMA DATABASE CHECK ---');
  const dbRecord = await prisma.interviewExecutionRecord.findUnique({
    where: { id: attempt1.submissionId }
  });

  const dbAi = dbRecord?.aiAnalysis;
  console.log('DB Record ID:', dbRecord?.id);
  console.log('DB Record Status:', dbRecord?.status);
  console.log('DB Record Has aiAnalysis:', !!dbAi);
  console.log('DB aiAnalysis Status:', dbAi?.status);
  console.log('DB aiAnalysis Model:', dbAi?.model);

  if (aiAnalysis?.status === 'COMPLETED' && dbAi?.status === 'COMPLETED') {
    console.log('\n🎉 SUCCESS! Coding AI Analysis successfully generated, persisted to DB, and returned by Report API!');
  } else {
    console.error('\n❌ FAILURE: aiAnalysis status is not COMPLETED!');
    process.exit(1);
  }
}

verifyAIAnalysisEndToEnd().then(() => {
  prisma.$disconnect();
}).catch(err => {
  console.error('Error during test:', err);
  prisma.$disconnect();
  process.exit(1);
});
