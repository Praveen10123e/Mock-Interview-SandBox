/**
 * test_hr_phase4_e2e.ts
 *
 * End-to-End Live Database & Service Verification for Phase 4 HR Interview Summary Generator:
 * 1. Session initialization with realistic candidate profile
 * 2. Multi-turn responses (technical experience & behavioral STAR)
 * 3. Session completion via completeHR()
 * 4. Verification that Phase 4 summary Json is persisted to HRInterviewEvaluation in PostgreSQL
 * 5. Verification of Zero-Hallucination rules, Word Count (<= 250 words), and Score Consistency
 * 6. Report retrieval (getReport) reuses persisted summary with zero LLM re-run
 * 7. Interactive Chatbot verification ("Ask About My Interview"):
 *    - Weakness query -> areasForImprovement
 *    - Strengths query -> topStrengths
 *    - Score query -> officialHRScore + HRScoreEngine authority
 *    - Communication query -> speechSummary
 *    - STAR query -> starAssessment
 */

import { PrismaClient } from '../apps/backend/services/interview-service/src/generated/client';
import { HRInterviewService } from '../apps/backend/services/interview-service/src/services/HRInterviewService';
import { ReportChatService } from '../apps/backend/services/interview-service/src/services/ReportChatService';

const prisma = new PrismaClient();

async function runPhase4E2E() {
  console.log('================================================================');
  console.log('STARTING PHASE 4 LIVE DATABASE & SUMMARY GENERATOR E2E TEST');
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

  // 1. Setup Test Interview Record in PostgreSQL database
  const testIdentityId = `test-phase4-candidate-${Date.now()}`;
  const testInterviewId = `test-phase4-session-${Date.now()}`;

  await prisma.interview.create({
    data: {
      id: testInterviewId,
      identityId: testIdentityId,
      title: 'Phase 4 HR Interview Summary Generator E2E Interview',
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
    const session = await HRInterviewService.initSession(testInterviewId, testIdentityId, 'Full Stack Engineer');

    assert(session.id !== undefined, 'STEP 1.1: HR session created in PostgreSQL');
    assert(session.status === 'READY', 'STEP 1.2: Session status initialized to READY');
    const q1 = session.questions[0];

    // ─── STEP 2: START SESSION & ANSWER QUESTIONS ──────────────────────────────
    console.log('\n--- STEP 2: ANSWERING INTERVIEW QUESTIONS WITH VERIFIED EVIDENCE ---');
    await HRInterviewService.startSession(testInterviewId, testIdentityId);

    // Question 1: Technical Project Experience
    const q1Transcript =
      'I worked on a web application project using React and Node.js with PostgreSQL. I implemented RESTful endpoints for user authentication, and I wrote automated tests using Jest. The system handled our test traffic reliably.';
    const q1Submit = await HRInterviewService.submitResponse(
      testInterviewId,
      testIdentityId,
      q1.id,
      q1Transcript,
      45
    );
    assert(q1Submit.success === true, 'STEP 2.1: Q1 submitted successfully');
    assert(Boolean(q1Submit.nextMainQuestion), 'STEP 2.2: Next adaptive question generated');

    // Question 2: Behavioral Conflict / Resolution
    const q2 = q1Submit.nextMainQuestion!;
    const q2Transcript =
      'In my previous role, our team had conflicting opinions on whether to migrate to microservices. When we faced a release deadline, I organized a technical design review to compare both architectures. I documented the latency benchmarks and proposed keeping the modular monolith for the current milestone. We delivered the release on schedule with zero customer downtime.';
    const q2Submit = await HRInterviewService.submitResponse(
      testInterviewId,
      testIdentityId,
      q2.id,
      q2Transcript,
      60
    );
    assert(q2Submit.success === true, 'STEP 2.3: Q2 submitted successfully');

    // ─── STEP 3: COMPLETE HR SESSION & GENERATE SUMMARY ────────────────────────
    console.log('\n--- STEP 3: COMPLETING HR SESSION & GENERATING PHASE 4 SUMMARY ---');
    const completeResult = await HRInterviewService.completeHR(testInterviewId, testIdentityId);
    assert(completeResult.success === true && completeResult.stage === 'HR_COMPLETED', 'STEP 3.1: Session status marked COMPLETED');

    // ─── STEP 4: VERIFY POSTGRESQL PERSISTENCE OF SUMMARY ──────────────────────
    console.log('\n--- STEP 4: VERIFY DATABASE PERSISTENCE OF SUMMARY JSON ---');
    const hrEvalDB = await (prisma as any).hRInterviewEvaluation.findFirst({
      where: { hrSession: { interviewId: testInterviewId } },
    });

    assert(hrEvalDB !== null, 'STEP 4.1: HRInterviewEvaluation record found in database');
    assert(hrEvalDB.summary !== null, 'STEP 4.2: summary Json column persisted in HRInterviewEvaluation');

    const summary = hrEvalDB.summary as any;
    assert(summary.status === 'completed', 'STEP 4.3: summary.status is "completed"', `Status: ${summary.status}`);
    assert(Boolean(summary.executiveSummary), 'STEP 4.4: Executive summary generated');

    const wordCount = summary.executiveSummary.trim().split(/\s+/).length;
    assert(wordCount <= 250, 'STEP 4.5: Executive summary within 250 word limit', `Words: ${wordCount}`);

    // Verify official score authority
    assert(
      summary.overallAssessment.officialScore === Math.round(hrEvalDB.overallScore),
      'STEP 4.6: Official score matches HRScoreEngine authoritative score exactly',
      `Summary Score: ${summary.overallAssessment.officialScore}, DB Score: ${Math.round(hrEvalDB.overallScore)}`
    );
    assert(
      summary.overallAssessment.scoreSource === 'HRScoreEngine',
      'STEP 4.7: Score source declared strictly as "HRScoreEngine"'
    );
    assert(summary.readinessScore === null, 'STEP 4.8: readinessScore is strictly null (no LLM hallucination)');

    // Verify strengths and weaknesses
    assert(summary.topStrengths.length >= 2, 'STEP 4.9: At least 2-3 top strengths generated', `Count: ${summary.topStrengths.length}`);
    assert(summary.topStrengths.every((s: any) => Boolean(s.evidence)), 'STEP 4.10: Every strength includes concrete evidence');
    assert(summary.areasForImprovement.length >= 1, 'STEP 4.11: Actionable areas for improvement generated', `Count: ${summary.areasForImprovement.length}`);
    assert(summary.areasForImprovement.every((a: any) => Boolean(a.recommendation)), 'STEP 4.12: Every improvement area has an actionable recommendation');

    // Verify STAR and Communication summaries
    assert(summary.starAssessment !== undefined, 'STEP 4.13: STAR performance assessment aggregated');
    assert(summary.communicationAssessment !== undefined, 'STEP 4.14: Communication intelligence assessment aggregated');

    // ─── STEP 5: VERIFY REPORT RETRIEVAL (ZERO REGENERATION) ───────────────────
    console.log('\n--- STEP 5: VERIFY REPORT RETRIEVAL REUSES PERSISTED SUMMARY ---');
    const reportSession = await HRInterviewService.getReport(testInterviewId, testIdentityId);
    assert(reportSession.evaluation?.summary !== undefined, 'STEP 5.1: getReport exposes evaluation.summary');
    assert(
      reportSession.evaluation?.summary?.executiveSummary === summary.executiveSummary,
      'STEP 5.2: getReport returns identical persisted summary without re-invoking LLM'
    );

    // ─── STEP 6: VERIFY CHATBOT GROUNDING IN STORED EVIDENCE ───────────────────
    console.log('\n--- STEP 6: VERIFY CHATBOT EVIDENCE RETRIEVAL (ASK ABOUT MY INTERVIEW) ---');

    // 6.1 Weakness query
    const weaknessChat = await ReportChatService.handleChatQuery(
      testInterviewId,
      testIdentityId,
      'What was my biggest weakness in the HR interview?'
    );
    assert(
      weaknessChat.content.includes('Improvement') || weaknessChat.content.includes('Advice') || weaknessChat.content.includes('Observation'),
      'STEP 6.1: Chatbot answers weakness query using areasForImprovement evidence'
    );

    // 6.2 Strengths query
    const strengthChat = await ReportChatService.handleChatQuery(
      testInterviewId,
      testIdentityId,
      'What did I do well in my HR interview?'
    );
    assert(
      strengthChat.content.includes('Strengths') || strengthChat.content.includes('Demonstrated'),
      'STEP 6.2: Chatbot answers strength query using topStrengths evidence'
    );

    // 6.3 Score query
    const scoreChat = await ReportChatService.handleChatQuery(
      testInterviewId,
      testIdentityId,
      `Why did I get ${summary.overallAssessment.officialScore}?`
    );
    assert(
      scoreChat.content.includes('HRScoreEngine') && scoreChat.content.includes(String(summary.overallAssessment.officialScore)),
      'STEP 6.3: Chatbot explains score citing HRScoreEngine and identical authoritative score'
    );

    // 6.4 Communication query
    const commChat = await ReportChatService.handleChatQuery(
      testInterviewId,
      testIdentityId,
      'How was my communication during the interview?'
    );
    assert(
      commChat.content.includes('Communication') || commChat.content.includes('Speech'),
      'STEP 6.4: Chatbot answers communication query using speechSummary intelligence'
    );

    // 6.5 STAR query
    const starChat = await ReportChatService.handleChatQuery(
      testInterviewId,
      testIdentityId,
      'How was my STAR performance?'
    );
    assert(
      starChat.content.includes('STAR') && starChat.content.includes('Framework'),
      'STEP 6.5: Chatbot answers STAR query using starAssessment evidence'
    );

    console.log('\n================================================================');
    console.log(`PHASE 4 E2E TEST COMPLETE: ${passed}/${total} ASSERTIONS PASSED`);
    console.log('================================================================');

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Phase 4 E2E test encountered an error:', err);
    process.exit(1);
  } finally {
    // Cleanup test records
    try {
      await (prisma as any).hRInterviewEvaluation.deleteMany({
        where: { hrSession: { interviewId: testInterviewId } },
      });
      await (prisma as any).hRInterviewResponse.deleteMany({
        where: { hrSession: { interviewId: testInterviewId } },
      });
      await (prisma as any).hRInterviewQuestion.deleteMany({
        where: { hrSession: { interviewId: testInterviewId } },
      });
      await (prisma as any).hRSession.deleteMany({
        where: { interviewId: testInterviewId },
      });
      await prisma.interviewHistory.deleteMany({
        where: { interviewId: testInterviewId },
      });
      await prisma.interview.deleteMany({
        where: { id: testInterviewId },
      });
    } catch {
      // Ignore cleanup error
    }
    await prisma.$disconnect();
  }
}

runPhase4E2E().catch((err) => {
  console.error('Unhandled Phase 4 E2E test failure:', err);
  process.exit(1);
});
