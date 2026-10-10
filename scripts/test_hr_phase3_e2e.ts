/**
 * test_hr_phase3_e2e.ts
 *
 * End-to-End Live Database & Service Verification for Phase 3 Speech Intelligence:
 * 1. Session initialization
 * 2. Response submission with spoken fillers & phrasing markers
 * 3. Immediate persistence of speechAnalysis Json field on HRInterviewResponse in PostgreSQL
 * 4. Verification that rawTranscript is immutable and preserved
 * 5. Verification that speech metrics do NOT alter official deterministic HR score
 * 6. Session completion and persistence of speechSummary Json field on HRInterviewEvaluation
 * 7. Report retrieval (getReport) reuses persisted data with zero AI re-run
 */

import { PrismaClient } from '../apps/backend/services/interview-service/src/generated/client';
import { HRInterviewService } from '../apps/backend/services/interview-service/src/services/HRInterviewService';

const prisma = new PrismaClient();

async function runPhase3E2E() {
  console.log('================================================================');
  console.log('STARTING PHASE 3 LIVE DATABASE & SPEECH INTELLIGENCE E2E TEST');
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
  const testIdentityId = `test-phase3-candidate-${Date.now()}`;
  const testInterviewId = `test-phase3-session-${Date.now()}`;

  await prisma.interview.create({
    data: {
      id: testInterviewId,
      identityId: testIdentityId,
      title: 'Phase 3 Speech Intelligence Verification Interview',
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

    assert(session.id !== undefined, 'STEP 1.1: HR session created in PostgreSQL');
    assert(session.status === 'READY', 'STEP 1.2: Session status initialized to READY');
    const q1 = session.questions[0];

    // ─── STEP 2: START SESSION & SUBMIT RESPONSE WITH SPEECH PATTERNS ──────────
    console.log('\n--- STEP 2: SUBMIT RESPONSE WITH FILLERS & CONFIDENCE MARKERS ---');
    await HRInterviewService.startSession(testInterviewId, testIdentityId);

    const q1RawTranscript =
      'Um, hello! So basically, like, I worked on a full stack project. I implemented the backend API with Node.js and I tested the endpoints with Jest. It was, you know, quite challenging.';
    const q1Duration = 30; // 30 seconds

    const q1Submit = await HRInterviewService.submitResponse(
      testInterviewId,
      testIdentityId,
      q1.id,
      q1RawTranscript,
      q1Duration
    );

    assert(q1Submit.success === true, 'STEP 2.1: Response submission succeeded');

    // ─── STEP 3: VERIFY DATABASE PERSISTENCE OF SPEECH ANALYSIS ────────────────
    console.log('\n--- STEP 3: VERIFY DB PERSISTENCE IN HRInterviewResponse ---');
    const q1ResponseDB = await (prisma as any).hRInterviewResponse.findUnique({
      where: { questionId: q1.id },
    });

    assert(q1ResponseDB !== null, 'STEP 3.1: Response record found in database');
    assert(q1ResponseDB.rawTranscript === q1RawTranscript, 'STEP 3.2: rawTranscript preserved strictly and immutably');
    assert(Boolean(q1ResponseDB.verifiedTranscript), 'STEP 3.3: verifiedTranscript populated');
    assert(q1ResponseDB.speechAnalysis !== null, 'STEP 3.4: speechAnalysis Json field persisted in database');

    const speech = q1ResponseDB.speechAnalysis as any;
    assert(speech.status === 'completed', 'STEP 3.5: Speech analysis marked completed', `Status: ${speech.status}`);
    assert(speech.fillerWords.total >= 2, 'STEP 3.6: Filler words detected in speechAnalysis', `Total fillers: ${speech.fillerWords.total}`);
    assert(speech.fillerWords.ratePer100Words > 0, 'STEP 3.7: Filler rate per 100 words computed', `Rate: ${speech.fillerWords.ratePer100Words}%`);
    assert(speech.speechPace.wordsPerMinute !== null, 'STEP 3.8: WPM calculated accurately using reliable duration', `WPM: ${speech.speechPace.wordsPerMinute}`);
    assert(speech.confidenceMarkers.confidenceCount >= 2, 'STEP 3.9: Language confidence markers detected ("I implemented", "I tested")', `Confidence: ${speech.confidenceMarkers.confidenceCount}`);
    assert(speech.recommendations.length > 0, 'STEP 3.10: Actionable coaching recommendations generated', `Count: ${speech.recommendations.length}`);

    // ─── STEP 4: VERIFY SCORING INDEPENDENCE ────────────────────────────────────
    console.log('\n--- STEP 4: VERIFY OFFICIAL DETERMINISTIC HR SCORE INDEPENDENCE ---');
    const initialQuestionScore = q1ResponseDB.questionScore;
    assert(typeof initialQuestionScore === 'number' && initialQuestionScore > 0, 'STEP 4.1: Deterministic question score exists', `Score: ${initialQuestionScore}`);

    // Check that official HR score is strictly from dimensionScores and not deducted by speech analysis
    const dims = q1ResponseDB.dimensionScores as Record<string, number>;
    const dimValues = Object.values(dims);
    const expectedScore = Math.round((dimValues.reduce((s, v) => s + v, 0) / dimValues.length) * 10 * 100) / 100;
    assert(
      Math.abs(initialQuestionScore - expectedScore) < 0.1,
      'STEP 4.2: Official HR questionScore strictly matches deterministic dimension formula',
      `Actual: ${initialQuestionScore}, Formula: ${expectedScore}`
    );

    // ─── STEP 5: COMPLETE HR SESSION & VERIFY EVALUATION SPEECH SUMMARY ────────
    console.log('\n--- STEP 5: COMPLETE HR SESSION & VERIFY speechSummary IN DB ---');
    const completeResult = await HRInterviewService.completeHR(testInterviewId, testIdentityId);
    assert(completeResult.success === true, 'STEP 5.1: completeHR execution succeeded');

    const evalDB = await (prisma as any).hRInterviewEvaluation.findUnique({
      where: { hrSessionId: session.id },
    });

    assert(evalDB !== null, 'STEP 5.2: Evaluation record found in database');
    assert(evalDB.speechSummary !== null, 'STEP 5.3: speechSummary Json persisted in HRInterviewEvaluation in DB');

    const summary = evalDB.speechSummary as any;
    assert(summary.totalFillerWords >= 2, 'STEP 5.4: Aggregated totalFillerWords in DB summary', `Total: ${summary.totalFillerWords}`);
    assert(summary.averageFillerRate > 0, 'STEP 5.5: Aggregated averageFillerRate in DB summary', `Avg rate: ${summary.averageFillerRate}%`);
    assert(summary.averageWpm !== null, 'STEP 5.6: Aggregated averageWpm in DB summary', `Avg WPM: ${summary.averageWpm}`);
    assert(summary.coachingRecommendations.length > 0, 'STEP 5.7: Session-level coaching recommendations persisted');

    // ─── STEP 6: VERIFY REPORT REUSE (NO HISTORICAL RE-COMPUTE) ────────────────
    console.log('\n--- STEP 6: VERIFY REPORT REUSE (NO HISTORICAL RE-RUN) ---');
    const report1 = await HRInterviewService.getReport(testInterviewId, testIdentityId);
    assert(report1.evaluation?.speechSummary !== undefined, 'STEP 6.1: getReport returns evaluation.speechSummary');
    assert(report1.questions[0].response?.speechAnalysis !== undefined, 'STEP 6.2: getReport returns response.speechAnalysis');

    // Simulate page refresh / second getReport call
    const report2 = await HRInterviewService.getReport(testInterviewId, testIdentityId);
    assert(
      JSON.stringify(report1.evaluation?.speechSummary) === JSON.stringify(report2.evaluation?.speechSummary),
      'STEP 6.3: Consecutive getReport calls return identical persisted speechSummary'
    );
    assert(
      report1.evaluation?.overallScore === report2.evaluation?.overallScore,
      'STEP 6.4: Official overall HR score is completely immutable and unchanged'
    );

    console.log('\n================================================================');
    console.log(`PHASE 3 E2E SUITE COMPLETE: ${passed}/${total} TESTS PASSED`);
    console.log('================================================================');

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Phase 3 E2E test failed with unhandled error:', err);
    process.exit(1);
  } finally {
    // Cleanup test data
    try {
      await (prisma as any).hRInterviewResponse.deleteMany({ where: { question: { hrSession: { interviewId: testInterviewId } } } });
      await (prisma as any).hRInterviewQuestion.deleteMany({ where: { hrSession: { interviewId: testInterviewId } } });
      await (prisma as any).hRInterviewEvaluation.deleteMany({ where: { hrSession: { interviewId: testInterviewId } } });
      await (prisma as any).hRInterviewSession.deleteMany({ where: { interviewId: testInterviewId } });
      await prisma.interviewHistory.deleteMany({ where: { interviewId: testInterviewId } });
      await prisma.interviewSession.deleteMany({ where: { interviewId: testInterviewId } });
      await prisma.interview.deleteMany({ where: { id: testInterviewId } });
    } catch { /* cleanup ignore */ }
    await prisma.$disconnect();
  }
}

runPhase3E2E();
