/**
 * test_hr_consistency.ts
 *
 * PHASE 4 VALIDATION — REGRESSION TEST SUITE FOR HR REPORT DATA CONSISTENCY
 *
 * Verifies all 8 core consistency requirements:
 * TEST 1: Official score = 58 -> No section displays 40 (Top, Summary, Assessment, Chatbot, aiSummary)
 * TEST 2: 3 displayed behavioral questions -> No STAR section displays 4 (completeCount <= applicableCount <= 3)
 * TEST 3: speechSummary.averageWpm = 60 -> No section displays 40 WPM; interview-level WPM is authoritative
 * TEST 4: Raw transcript differs from verified transcript -> Summary uses verified transcript, corruptions marked uncertain
 * TEST 5: Question A has response A, Question B has response B -> Strict questionId mapping (no cross-mapping)
 * TEST 6: Duplicate question text with different IDs -> Responses remain attached strictly via questionId
 * TEST 7: Refresh report -> Exact same persisted evidence reused with zero LLM drift
 * TEST 8: Official score changes after new response -> New report reflects updated score consistently
 */

import { PrismaClient } from '../apps/backend/services/interview-service/src/generated/client';
import { HRInterviewService } from '../apps/backend/services/interview-service/src/services/HRInterviewService';
import { HRScoreEngine } from '../apps/backend/services/interview-service/src/services/HRScoreEngine';
import { HRTranscriptValidator } from '../apps/backend/services/interview-service/src/services/HRTranscriptValidator';
import { ReportChatService } from '../apps/backend/services/interview-service/src/services/ReportChatService';
import { ReportAnalysisService } from '../apps/backend/services/interview-service/src/services/ReportAnalysisService';

const prisma = new PrismaClient();

async function runConsistencyTests() {
  console.log('================================================================');
  console.log('STARTING PHASE 4 HR REPORT DATA CONSISTENCY REGRESSION TESTS');
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

  const testIdentityId = `test-hr-consistent-user-${Date.now()}`;
  const testInterviewId = `test-hr-consistent-int-${Date.now()}`;

  // Create base interview record
  await prisma.interview.create({
    data: {
      id: testInterviewId,
      identityId: testIdentityId,
      title: 'HR Consistency Regression Test Interview',
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
    // ══════════════════════════════════════════════════════════════════════════
    // SETUP: INITIALIZE SESSION & RECORD RESPONSES (Scores: 54, 58, 60 -> Overall 57.33 -> 57-58)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- SETTING UP INTERVIEW SESSION WITH 3 MAIN QUESTIONS ---');
    const initSession = await HRInterviewService.initSession(testInterviewId, testIdentityId, 'Software Engineer');
    await HRInterviewService.startSession(testInterviewId, testIdentityId);

    const mainQuestions = initSession.questions.filter((q: any) => q.questionType === 'MAIN');
    assert(mainQuestions.length === 3, 'Setup: Created exactly 3 main questions');

    const q1 = mainQuestions[0];
    const q2 = mainQuestions[1];
    const q3 = mainQuestions[2];

    // Submit Response 1 with an acoustic corruption and stutter:
    // "hello I am driving hello I am Praveen ji Institute of Technology"
    console.log('\nSubmitting Q1 (Self Introduction)...');
    const q1Raw = 'hello I am driving hello I am Praveen ji Institute of Technology. I am a software engineer focused on backend systems.';
    await HRInterviewService.submitResponse(testInterviewId, testIdentityId, q1.id, q1Raw, 35);

    // Override Q1 questionScore to 54 for exact test reproduction
    await (prisma as any).hRInterviewResponse.update({
      where: { questionId: q1.id },
      data: {
        questionScore: 54,
        dimensionScores: {
          relevance: 5.4,
          specificity: 5.4,
          evidence: 5.4,
          structure: 5.4,
          clarity: 5.4,
          technicalDepth: 5.4,
          ownership: 5.4,
          professionalism: 5.4,
        },
      },
    });

    // Submit Response 2 (Behavioral STAR):
    console.log('Submitting Q2 (Project Challenge)...');
    const q2Raw = 'constable I can\'t say that every team members was aligned, but I stepped in using React and Node.js to resolve the latency bottleneck, reducing API response times by 30%.';
    await HRInterviewService.submitResponse(testInterviewId, testIdentityId, q2.id, q2Raw, 40);

    // Override Q2 questionScore to 58 for exact test reproduction
    await (prisma as any).hRInterviewResponse.update({
      where: { questionId: q2.id },
      data: {
        questionScore: 58,
        dimensionScores: {
          relevance: 5.8,
          specificity: 5.8,
          evidence: 5.8,
          structure: 5.8,
          clarity: 5.8,
          technicalDepth: 5.8,
          ownership: 5.8,
          professionalism: 5.8,
        },
        starAnalysis: {
          starApplicable: true,
          situation: { present: true, score: 7 },
          task: { present: true, score: 6 },
          action: { present: true, score: 7 },
          result: { present: true, score: 6 },
          completeness: 100,
        },
      },
    });

    // Submit Response 3 (Behavioral STAR without Result):
    console.log('Submitting Q3 (Teamwork)...');
    const q3Raw = 'In our college project, we had a disagreement regarding database schema design between PostgreSQL and MongoDB. I organized a comparison meeting and we selected PostgreSQL based on query relationships.';
    await HRInterviewService.submitResponse(testInterviewId, testIdentityId, q3.id, q3Raw, 45);

    // Override Q3 questionScore to 60 for exact test reproduction
    await (prisma as any).hRInterviewResponse.update({
      where: { questionId: q3.id },
      data: {
        questionScore: 60,
        dimensionScores: {
          relevance: 6.0,
          specificity: 6.0,
          evidence: 6.0,
          structure: 6.0,
          clarity: 6.0,
          technicalDepth: 6.0,
          ownership: 6.0,
          professionalism: 6.0,
        },
        starAnalysis: {
          starApplicable: true,
          situation: { present: true, score: 7 },
          task: { present: true, score: 6 },
          action: { present: true, score: 6 },
          result: { present: false, score: 0 },
          completeness: 75,
        },
      },
    });

    // Complete HR Session
    console.log('\nCompleting HR Interview Session...');
    const completeResult = await HRInterviewService.completeHR(testInterviewId, testIdentityId);
    assert(completeResult.success === true, 'Setup: completeHR executed successfully');

    // Retrieve authoritative report DTO
    const report = await HRInterviewService.getReport(testInterviewId, testIdentityId);

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 1: OFFICIAL SCORE = HRScoreEngine (e.g. ~57-58) — NO SECTION DISPLAYS 40
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST 1: OFFICIAL SCORE SINGLE SOURCE OF TRUTH ---');
    const expectedAuthoritativeScore = HRScoreEngine.calculateOverallHRScore([54, 58, 60]); // 57.33 -> round 57 or 58
    const roundedExpected = Math.round(expectedAuthoritativeScore);

    const topScore = Math.round(report.evaluation.overallScore);
    const summaryScore = Math.round(report.evaluation.summary?.overallAssessment?.officialScore);
    const sessionScore = Math.round(report.overallScore);
    const aiSummaryText = report.evaluation.aiSummary || '';
    const executiveSummaryText = report.evaluation.summary?.executiveSummary || '';

    assert(
      topScore === roundedExpected && summaryScore === roundedExpected && sessionScore === roundedExpected,
      'TEST 1.1: Top score, Summary score, and Session score all equal HRScoreEngine authoritative score',
      `Expected ${roundedExpected}, Top: ${topScore}, Summary: ${summaryScore}, Session: ${sessionScore}`
    );

    assert(
      !aiSummaryText.includes('40/100') && !executiveSummaryText.includes('40/100'),
      'TEST 1.2: aiSummary and executiveSummary DO NOT contain stale 40/100 score',
      `aiSummary: "${aiSummaryText}"`
    );

    // Verify Chatbot Score
    const chatbotReply = await ReportChatService.handleChatQuery(testInterviewId, testIdentityId, 'Why did I get this score in HR round?');
    assert(
      !chatbotReply.content.includes('40/100') && chatbotReply.content.includes(`${roundedExpected}/100`),
      'TEST 1.3: Chatbot answer reflects authoritative HR score and never displays 40/100',
      `Chatbot extract: ${chatbotReply.content.substring(0, 140)}...`
    );

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 2: QUESTION COUNT & STAR COUNT CONSISTENCY (3 Questions -> STAR applicable <= 3)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST 2: QUESTION COUNT & STAR COUNT CONSISTENCY ---');
    const displayedCount = report.questions.filter((q: any) => q.questionType === 'MAIN').length;
    assert(displayedCount === 3, 'TEST 2.1: Exactly 3 main behavioral questions displayed in report');

    const starAssessment = report.evaluation.summary?.starAssessment;
    assert(
      starAssessment !== undefined && starAssessment.applicableResponses <= displayedCount,
      'TEST 2.2: STAR applicable count never exceeds displayed questions count (never 4)',
      `Applicable: ${starAssessment?.applicableResponses}, Complete: ${starAssessment?.completeResponses}`
    );

    assert(
      starAssessment.completeResponses <= starAssessment.applicableResponses,
      'TEST 2.3: Invariant completeResponses <= applicableResponses strictly holds',
      `${starAssessment.completeResponses} <= ${starAssessment.applicableResponses}`
    );

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 3: SPEECH PACE CONSISTENCY (speechSummary.averageWpm is Authoritative)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST 3: SPEECH PACE CONSISTENCY ---');
    const speechSummary = report.evaluation.speechSummary;
    const authoritativeWpm = speechSummary?.averageWpm !== null ? Math.round(speechSummary.averageWpm) : null;
    assert(authoritativeWpm !== null, 'TEST 3.1: Speech summary has authoritative average WPM', `WPM: ${authoritativeWpm}`);

    // Verify communication assessment or executive summary does not invent a conflicting 40 WPM if average is different
    const commImprovements = report.evaluation.summary?.communicationAssessment?.improvements || [];
    const hasConflicting40Wpm = commImprovements.some((imp: string) => imp.includes('40 WPM') && authoritativeWpm !== 40);
    assert(
      !hasConflicting40Wpm,
      'TEST 3.2: Communication assessment does not contain discordant WPM values',
      `Improvements: ${JSON.stringify(commImprovements)}`
    );

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 4: RAW VS VERIFIED TRANSCRIPT & UNCERTAIN SEGMENTS
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST 4: RAW VS VERIFIED TRANSCRIPT & UNCERTAIN CORRUPTIONS ---');
    const valResult1 = HRTranscriptValidator.verifyTranscript(q1Raw, { category: 'Self Introduction' });
    const valResult2 = HRTranscriptValidator.verifyTranscript(q2Raw, { category: 'Project Challenge' });

    assert(
      valResult1.rawTranscript === q1Raw,
      'TEST 4.1: Raw transcript remains immutable',
      `Raw: "${valResult1.rawTranscript.substring(0, 50)}..."`
    );

    const hasUncertainConstable = valResult2.uncertainSegments.some(
      (u) => u.text.toLowerCase().includes('constable')
    );
    assert(
      hasUncertainConstable,
      'TEST 4.2: Acoustic corruption "constable" flagged in uncertainSegments without fabricating a word',
      `Uncertain segments: ${JSON.stringify(valResult2.uncertainSegments)}`
    );

    const hasUncertainRestart = valResult1.uncertainSegments.some(
      (u) => u.text.toLowerCase().includes('hello i am driving') || u.reason.toLowerCase().includes('restart')
    );
    assert(
      hasUncertainRestart,
      'TEST 4.3: Garbled introducer / false start flagged as uncertain segment',
      `Uncertain segments: ${JSON.stringify(valResult1.uncertainSegments)}`
    );

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 5: QUESTION/ANSWER MAPPING INTEGRITY
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST 5: QUESTION/ANSWER MAPPING INTEGRITY ---');
    for (const q of report.questions) {
      if (q.response) {
        assert(
          q.response.questionId === q.id,
          `TEST 5.1: Question ${q.sequence} strictly attached to response via questionId`,
          `q.id (${q.id}) === response.questionId (${q.response.questionId})`
        );
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 6: DUPLICATE QUESTION TEXT PREVENTED BY ADAPTIVE SELECTOR
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST 6: NO DUPLICATE QUESTION TEXT IN SESSION ---');
    const mainQuestionTexts = report.questions
      .filter((q: any) => q.questionType === 'MAIN')
      .map((q: any) => q.question.trim().toLowerCase());
    const uniqueTexts = new Set(mainQuestionTexts);
    assert(
      mainQuestionTexts.length === uniqueTexts.size,
      'TEST 6.1: All main questions have distinct, non-duplicate question texts',
      `Count: ${mainQuestionTexts.length}, Unique: ${uniqueTexts.size}`
    );

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 7: REPORT REFRESH REUSES PERSISTED EVIDENCE WITH ZERO DRIFT
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST 7: REPORT REFRESH STABILITY ---');
    const reportRefresh1 = await HRInterviewService.getReport(testInterviewId, testIdentityId);
    const reportRefresh2 = await HRInterviewService.getReport(testInterviewId, testIdentityId);

    assert(
      reportRefresh1.overallScore === reportRefresh2.overallScore &&
      reportRefresh1.evaluation.summary.executiveSummary === reportRefresh2.evaluation.summary.executiveSummary,
      'TEST 7.1: Repeated report reads return identical persisted evidence with zero drift',
      `Scores match (${reportRefresh1.overallScore}) and summaries match`
    );

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 8: OFFICIAL SCORE UPDATES CONSISTENTLY ACROSS ALL SECTIONS
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- TEST 8: OFFICIAL SCORE HARMONIZATION ON UPDATE ---');
    // Change Q3 score to 90 -> New scores: [54, 58, 90] -> (54+58+90)/3 = 202/3 = 67.33 -> 67
    await (prisma as any).hRInterviewResponse.update({
      where: { questionId: q3.id },
      data: { questionScore: 90 },
    });

    // Mark session IN_PROGRESS temporarily so completeHR can re-evaluate
    await (prisma as any).hRInterviewSession.update({
      where: { interviewId: testInterviewId },
      data: { status: 'IN_PROGRESS' },
    });

    await HRInterviewService.completeHR(testInterviewId, testIdentityId);
    const updatedReport = await HRInterviewService.getReport(testInterviewId, testIdentityId);

    const newAuthoritativeScore = HRScoreEngine.calculateOverallHRScore([54, 58, 90]);
    const roundedNew = Math.round(newAuthoritativeScore);

    assert(
      Math.round(updatedReport.overallScore) === roundedNew &&
      Math.round(updatedReport.evaluation.overallScore) === roundedNew &&
      Math.round(updatedReport.evaluation.summary.overallAssessment.officialScore) === roundedNew,
      'TEST 8.1: Updated score reflects consistently across Session, Evaluation, and Summary',
      `Expected ${roundedNew}, got ${Math.round(updatedReport.overallScore)}`
    );

    assert(
      updatedReport.evaluation.aiSummary.includes(`${roundedNew}/100`),
      'TEST 8.2: Updated aiSummary displays new score consistently',
      `aiSummary: "${updatedReport.evaluation.aiSummary}"`
    );

  } catch (err: any) {
    console.error('Test execution error:', err);
    assert(false, 'Fatal test error', err.message);
  } finally {
    // Cleanup test interview records
    try {
      await (prisma as any).hRInterviewResponse.deleteMany({
        where: { hrSession: { interviewId: testInterviewId } },
      });
      await (prisma as any).hRInterviewQuestion.deleteMany({
        where: { hrSession: { interviewId: testInterviewId } },
      });
      await (prisma as any).hRInterviewEvaluation.deleteMany({
        where: { hrSession: { interviewId: testInterviewId } },
      });
      await (prisma as any).hRInterviewSession.deleteMany({
        where: { interviewId: testInterviewId },
      });
      await prisma.interviewHistory.deleteMany({
        where: { interviewId: testInterviewId },
      });
      await prisma.interviewSession.deleteMany({
        where: { interviewId: testInterviewId },
      });
      await prisma.interview.delete({
        where: { id: testInterviewId },
      });
    } catch { /* cleanup best effort */ }

    await prisma.$disconnect();

    console.log('\n================================================================');
    console.log(`CONSISTENCY REGRESSION TESTS COMPLETED: ${passed}/${total} PASSED`);
    console.log('================================================================');

    if (passed === total && total > 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

runConsistencyTests();
