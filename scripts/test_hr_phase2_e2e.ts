/**
 * test_hr_phase2_e2e.ts
 *
 * End-to-End Live Database & Service Verification for Phase 2:
 * 1. Session initialization with Q1 Self-Introduction
 * 2. Q1 Response submission (Factual intro -> starApplicable = false)
 * 3. Immediate persistence of transcripts, dimensions, deterministic score, and STAR analysis
 * 4. Adaptive Next-Question Selector chooses Q2
 * 5. Q2 Response submission (Full STAR technical response -> score >= 80)
 * 6. STAR analysis persistence with verified evidence & coaching
 * 7. Adaptive Next-Question Selector steps up to Hard difficulty for Q3
 * 8. Refresh persistence verification (same Q3 preserved across simulated reloads)
 * 9. Completion & Report retrieval with zero LLM re-run
 */

import { PrismaClient } from '../apps/backend/services/interview-service/src/generated/client';
import { HRInterviewService } from '../apps/backend/services/interview-service/src/services/HRInterviewService';

const prisma = new PrismaClient();

async function runPhase2E2E() {
  console.log('================================================================');
  console.log('STARTING PHASE 2 END-TO-END HR PIPELINE INTEGRATION TEST');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (detail) console.log(`       ↳ ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       ↳ ${detail}`);
    }
  }

  // 1. Setup Test Interview Record in database
  const testIdentityId = `test-phase2-candidate-${Date.now()}`;
  const testInterviewId = `test-phase2-session-${Date.now()}`;

  const interview = await prisma.interview.create({
    data: {
      id: testInterviewId,
      identityId: testIdentityId,
      title: 'Phase 2 STAR & Adaptive Placement Interview',
      interviewType: 'MOCK',
      difficulty: 'MEDIUM',
      state: 'RUNNING',
      session: {
        create: {
          startedAt: new Date(),
        },
      },
    },
  });

  try {
    // ─── STEP 1: INITIALIZE HR SESSION ──────────────────────────────────────────
    console.log('\n--- STEP 1: INITIALIZING HR SESSION ---');
    const session = await HRInterviewService.initSession(testInterviewId, testIdentityId, 'Software Engineer');

    assert(session.id !== undefined, 'STEP 1.1: HR session successfully created in database');
    assert(session.status === 'READY', 'STEP 1.2: Session status initialized to READY');
    assert(session.questions.length === 3, 'STEP 1.3: Session pre-populates 3 question slots');

    const q1 = session.questions[0];
    assert(q1.sequence === 1, 'STEP 1.4: First question sequence is 1');
    assert(q1.category === 'Self Introduction', 'STEP 1.5: First question is Self Introduction');
    assert(q1.difficulty === 'easy', 'STEP 1.6: Q1 difficulty is easy');
    assert(q1.competency === 'communication', 'STEP 1.7: Q1 competency is communication');

    // ─── STEP 2: START SESSION & SUBMIT Q1 RESPONSE ─────────────────────────────
    console.log('\n--- STEP 2: START SESSION & SUBMIT Q1 (FACTUAL / INTRO) ---');
    await HRInterviewService.startSession(testInterviewId, testIdentityId);

    const q1Transcript = 'Hello, I am a computer science student passionate about full stack development. I have built web applications with React, Node.js, and PostgreSQL.';
    const q1Submit = await HRInterviewService.submitResponse(
      testInterviewId,
      testIdentityId,
      q1.id,
      q1Transcript,
      25
    );

    assert(q1Submit.success === true, 'STEP 2.1: Q1 response submission succeeded');

    // Check DB persistence directly
    const q1ResponseDB = await (prisma as any).hRInterviewResponse.findUnique({
      where: { questionId: q1.id },
    });

    assert(q1ResponseDB !== null, 'STEP 2.2: Q1 response persisted immediately in database');
    assert(q1ResponseDB.rawTranscript === q1Transcript, 'STEP 2.3: rawTranscript persisted immutably');
    assert(q1ResponseDB.verifiedTranscript.length > 0, 'STEP 2.4: verifiedTranscript persisted');
    assert(typeof q1ResponseDB.questionScore === 'number' && q1ResponseDB.questionScore > 0, 'STEP 2.5: Deterministic question score persisted', `Score: ${q1ResponseDB.questionScore}`);

    // Check STAR Analysis for Q1 (factual / intro -> starApplicable = false)
    const q1STAR = q1ResponseDB.starAnalysis;
    assert(q1STAR !== null && typeof q1STAR === 'object', 'STEP 2.6: STAR analysis record persisted in DB JSON field');
    assert(q1STAR.starApplicable === false, 'STEP 2.7: STAR analysis marked starApplicable = false for Self Introduction');
    assert(q1STAR.missingComponents.length === 0, 'STEP 2.8: Candidate NOT penalized with missing components on intro question');

    // Check adaptive question returned for Q2
    const q2Candidate = q1Submit.nextMainQuestion;
    assert(q2Candidate !== null, 'STEP 2.9: Adaptive selector provided next main question (Q2)');
    assert(q2Candidate.id !== q1.id, 'STEP 2.10: Q2 is a distinct question');
    assert(['easy', 'medium', 'hard'].includes(q2Candidate.difficulty), 'STEP 2.11: Q2 has valid difficulty assigned', `Diff: ${q2Candidate.difficulty}`);
    assert(typeof q2Candidate.competency === 'string', 'STEP 2.12: Q2 has explicit competency assigned', `Competency: ${q2Candidate.competency}`);
    assert(typeof q2Candidate.selectionReason === 'string', 'STEP 2.13: Q2 includes adaptive selection reasoning');

    // ─── STEP 3: SUBMIT Q2 (STRONG STAR TECHNICAL ANSWER) ───────────────────────
    console.log('\n--- STEP 3: SUBMIT Q2 (STRONG TECHNICAL ANSWER WITH FULL STAR) ---');
    const q2Transcript =
      'During my internship, our API response time increased significantly after we added a new database query. My task was to identify and resolve the latency bottleneck. I investigated the PostgreSQL query execution plans using EXPLAIN ANALYZE and implemented composite indexing and Redis caching. As a result, the query latency reduced by 65% and API response time improved to under 50ms.';

    const q2Submit = await HRInterviewService.submitResponse(
      testInterviewId,
      testIdentityId,
      q2Candidate.id,
      q2Transcript,
      40
    );

    assert(q2Submit.success === true, 'STEP 3.1: Q2 response submission succeeded');

    const q2ResponseDB = await (prisma as any).hRInterviewResponse.findUnique({
      where: { questionId: q2Candidate.id },
    });

    assert(q2ResponseDB !== null, 'STEP 3.2: Q2 response persisted in database');
    assert(q2ResponseDB.questionScore >= 75, 'STEP 3.3: High deterministic score awarded for strong answer', `Score: ${q2ResponseDB.questionScore}`);

    const q2STAR = q2ResponseDB.starAnalysis;
    assert(q2STAR.starApplicable === true, 'STEP 3.4: STAR applicable for behavioral project question');
    assert(q2STAR.situation.present === true, 'STEP 3.5: Situation detected');
    assert(q2STAR.task.present === true, 'STEP 3.6: Task detected');
    assert(q2STAR.action.present === true, 'STEP 3.7: Action detected');
    assert(q2STAR.result.present === true, 'STEP 3.8: Result detected');
    assert(q2STAR.starScore >= 70, 'STEP 3.9: High STAR score (>= 70) awarded', `STAR Score: ${q2STAR.starScore}`);
    assert(q2STAR.completeness === 100, 'STEP 3.10: 100% STAR completeness achieved');
    assert(q2STAR.missingComponents.length === 0, 'STEP 3.11: 0 missing components');
    assert(!q2STAR.improvedVersion.includes('40%'), 'STEP 3.12: Improved coaching version did not fabricate metrics');

    // ─── STEP 4: ADAPTIVE DIFFICULTY STEP-UP TO HARD ────────────────────────────
    console.log('\n--- STEP 4: ADAPTIVE SELECTOR STEP-UP TO HARD FOR Q3 ---');
    const q3Candidate = q2Submit.nextMainQuestion;
    assert(q3Candidate !== null, 'STEP 4.1: Adaptive selector provided next question (Q3)');
    assert(q3Candidate.difficulty === 'hard', 'STEP 4.2: Adaptive selector stepped up difficulty to HARD after score >= 80', `Received: ${q3Candidate.difficulty}`);
    assert(q3Candidate.id !== q1.id && q3Candidate.id !== q2Candidate.id, 'STEP 4.3: Q3 is completely distinct from Q1 and Q2 (no repetition)');
    assert(q3Candidate.selectionReason.includes('strong') || q3Candidate.selectionReason.includes(String(Math.round(q2ResponseDB.questionScore))), 'STEP 4.4: Selection reasoning cites strong performance');

    // ─── STEP 5: SIMULATE BROWSER REFRESH (SESSION PERSISTENCE) ─────────────────
    console.log('\n--- STEP 5: SIMULATE BROWSER REFRESH (PERSISTENCE VERIFICATION) ---');
    const refreshedSession = await HRInterviewService.initSession(testInterviewId, testIdentityId, 'Software Engineer');

    const refreshedQ3 = refreshedSession.questions.find((q: any) => q.id === q3Candidate.id);
    assert(refreshedQ3 !== undefined, 'STEP 5.1: Q3 slot preserved after simulated page reload');
    assert(refreshedQ3?.question === q3Candidate.question, 'STEP 5.2: Exact same question text preserved (NOT randomly re-rolled)');
    assert(refreshedQ3?.difficulty === 'hard', 'STEP 5.3: Exact difficulty "hard" preserved across refresh');
    assert(refreshedQ3?.selectionReason === q3Candidate.selectionReason, 'STEP 5.4: Selection reasoning preserved in DB');

    // ─── STEP 6: COMPLETE HR ROUND AND VERIFY REPORT ────────────────────────────
    console.log('\n--- STEP 6: COMPLETE HR ROUND & REPORT VERIFICATION ---');
    // Complete session
    await HRInterviewService.completeHR(testInterviewId, testIdentityId);

    const report = await HRInterviewService.getReport(testInterviewId, testIdentityId);
    assert(report.status === 'COMPLETED', 'STEP 6.1: Report reflects COMPLETED status');
    assert(typeof report.overallScore === 'number' && report.overallScore > 0, 'STEP 6.2: Authoritative overall HR score computed deterministically', `Score: ${report.overallScore}`);

    const reportQ1 = report.questions.find((q: any) => q.id === q1.id);
    const reportQ2 = report.questions.find((q: any) => q.id === q2Candidate.id);

    assert(reportQ1?.response?.starAnalysis !== undefined, 'STEP 6.3: Report includes Q1 STAR analysis from DB');
    assert(reportQ2?.response?.starAnalysis !== undefined, 'STEP 6.4: Report includes Q2 STAR analysis from DB');
    assert(reportQ2?.response?.starAnalysis?.starScore === q2STAR.starScore, 'STEP 6.5: Report reads stored STAR evidence without re-running AI');
    assert(reportQ2?.response?.starAnalysis?.metadata?.generatedAt === q2STAR.metadata.generatedAt, 'STEP 6.6: Analysis metadata timestamp is identical (idempotent)');

  } finally {
    // Clean up test records
    try {
      const sessionToDelete = await (prisma as any).hRInterviewSession.findUnique({
        where: { interviewId: testInterviewId },
      });
      if (sessionToDelete) {
        await (prisma as any).hRInterviewResponse.deleteMany({
          where: { hrSessionId: sessionToDelete.id },
        });
        await (prisma as any).hRInterviewQuestion.deleteMany({
          where: { hrSessionId: sessionToDelete.id },
        });
        await (prisma as any).hRInterviewEvaluation.deleteMany({
          where: { hrSessionId: sessionToDelete.id },
        });
        await (prisma as any).hRInterviewSession.delete({
          where: { id: sessionToDelete.id },
        });
      }
      await prisma.interviewSession.deleteMany({
        where: { interviewId: testInterviewId },
      });
      await prisma.interviewHistory.deleteMany({
        where: { interviewId: testInterviewId },
      });
      await prisma.interview.delete({
        where: { id: testInterviewId },
      });
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }

  console.log('\n================================================================');
  console.log(`END-TO-END TEST COMPLETE: ${passed}/${total} ASSERTIONS PASSED`);
  console.log('================================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase2E2E().catch((err) => {
  console.error('Fatal E2E test error:', err);
  process.exit(1);
});
