/**
 * AutopsyEvidenceCollector.ts
 *
 * Evidence-first collector for Phase 5 — Interview Autopsy.
 * Extracts authentic stored data across Aptitude, Coding, HR, and Reports.
 * NEVER reruns code. Strictly uses recorded database executions and verified transcripts.
 */

import { PrismaClient } from '../generated/client';
import { AutopsyEvidence, AutopsySourceType } from './AutopsyTypes';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export interface CollectedCandidateHistory {
  candidateId: string;
  interviews: Array<{
    id: string;
    title: string;
    interviewType: string;
    createdAt: string;
    finalizedAt: string | null;
    overallScore: number | null;
    aptitudeScore: number | null;
    codingScore: number | null;
    hrScore: number | null;
    reportSnapshot: any | null;
    evidenceItems: AutopsyEvidence[];
  }>;
  totalCompletedCount: number;
}

export class AutopsyEvidenceCollector {
  /**
   * Collect all historical interview evidence for a candidate
   */
  static async collectCandidateHistory(identityId: string): Promise<CollectedCandidateHistory> {
    if (!identityId) {
      throw new Error('Candidate identityId is required.');
    }

    // 1. Query all completed interviews for this candidate
    const rawInterviews = await (prisma as any).interview.findMany({
      where: {
        identityId,
        OR: [
          { state: 'COMPLETED' },
          { session: { finalizedAt: { not: null } } },
        ],
      },
      include: {
        session: {
          include: {
            progress: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const completedInterviews: CollectedCandidateHistory['interviews'] = [];

    for (const inv of rawInterviews) {
      const sessionId = inv.session?.id || inv.id;
      const snap = inv.session?.reportSnapshot as any;
      const dateStr = inv.createdAt.toISOString();
      const formattedDate = inv.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const evidenceItems: AutopsyEvidence[] = [];

      // ── A. APTITUDE EVIDENCE EXTRACTION ─────────────────────────────────────
      const aptStage = snap?.stages?.aptitude || snap?.aptitudeAnalysis;
      const aptQuestions: any[] = Array.isArray(aptStage?.questions)
        ? aptStage.questions
        : Array.isArray(aptStage)
        ? aptStage
        : [];

      aptQuestions.forEach((q: any, idx: number) => {
        const isCorrect = q.isCorrect === true || q.status === 'CORRECT';
        const isUnanswered = q.status === 'NOT_ATTEMPTED' || q.selectedOptionIndex === null || q.selectedOptionIndex === undefined;

        if (!isCorrect) {
          const evidenceType = isUnanswered ? 'UNANSWERED_QUESTION' : 'INCORRECT_QUESTION';
          evidenceItems.push({
            id: `ev-apt-${inv.id}-${q.questionId || idx}`,
            sourceType: 'APTITUDE',
            sourceId: q.questionId || `q-${idx}`,
            sessionId,
            interviewId: inv.id,
            interviewTitle: inv.title || 'Mock Interview',
            interviewDate: formattedDate,
            questionId: q.questionId || `q-${idx}`,
            questionTitle: q.title || q.question || `Aptitude Question ${idx + 1}`,
            evidenceType,
            description: isUnanswered
              ? `Question was not answered under session time limits (Topic: ${q.topic || 'Quantitative'}).`
              : `Selected option '${q.selectedOptionText || q.selectedOptionIndex}' when correct option was '${q.correctOptionText || q.correctOptionIndex}' (Topic: ${q.topic || 'Quantitative'}).`,
            score: isCorrect ? 100 : 0,
            details: {
              options: Array.isArray(q.options) ? q.options : [],
              selectedOptionIndex: q.selectedOptionIndex ?? null,
              selectedOptionText: q.selectedOptionText ?? null,
              correctOptionIndex: q.correctOptionIndex ?? 0,
              correctOptionText: q.correctOptionText ?? '',
              topic: q.topic || 'Aptitude & Logic',
              category: q.category || 'Quantitative',
              explanation: q.storedExplanation || q.whyCorrect || null,
            },
          });
        }
      });

      // ── B. CODING EVIDENCE EXTRACTION (Database execution records) ──────────
      // Query exact stored execution records from InterviewExecutionRecord
      const executionRecords = await (prisma as any).interviewExecutionRecord.findMany({
        where: { sessionId },
        orderBy: [{ questionRefId: 'asc' }, { attemptNumber: 'asc' }],
      });

      // Group records by question
      const recordsByQuestion: Record<string, any[]> = {};
      executionRecords.forEach((rec: any) => {
        const qId = rec.questionRefId || 'default';
        if (!recordsByQuestion[qId]) recordsByQuestion[qId] = [];
        recordsByQuestion[qId].push(rec);
      });

      // Also check snapshot coding questions for context
      const codingStage = snap?.stages?.coding;
      const codingProblems: any[] = Array.isArray(codingStage?.problems)
        ? codingStage.problems
        : Array.isArray(snap?.codingAnalysis)
        ? snap.codingAnalysis
        : [];

      // Process each coding problem
      for (const prob of codingProblems) {
        const qRefId = prob.questionId || prob.questionRefId || 'default';
        const records = recordsByQuestion[qRefId] || [];
        const latestSubmit = records.filter((r) => r.runMode === 'SUBMIT').slice(-1)[0] || records.slice(-1)[0];

        const testsPassed = latestSubmit?.passedCount ?? prob.testsPassed ?? prob.bestResult?.passedCount ?? 0;
        const testsTotal = latestSubmit?.totalCount ?? prob.testsTotal ?? prob.bestResult?.totalCount ?? prob.totalTests ?? 0;
        const isAccepted = testsTotal > 0 && testsPassed === testsTotal;

        if (!isAccepted) {
          // Extract failed test cases from stored testCaseResults
          const rawTCs = latestSubmit?.testCaseResults || prob.testResults || [];
          const failedTCs: any[] = [];

          if (Array.isArray(rawTCs)) {
            rawTCs.forEach((tc: any) => {
              const passed = tc.passed === true || tc.status === 'ACCEPTED' || tc.status === 'PASSED';
              if (!passed) {
                failedTCs.push({
                  testCaseId: tc.id || tc.testCaseId || `tc-${failedTCs.length + 1}`,
                  input: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input || ''),
                  expectedOutput: typeof tc.expectedOutput === 'string' ? tc.expectedOutput : JSON.stringify(tc.expectedOutput || ''),
                  actualOutput: typeof tc.actualOutput === 'string' ? tc.actualOutput : JSON.stringify(tc.actualOutput || ''),
                  status: tc.status || 'FAILED',
                  error: tc.error || tc.compileOutput || latestSubmit?.compileOutput || null,
                });
              }
            });
          }

          // Classify primary failure mode
          let failureType = 'FAILED_TEST';
          if (latestSubmit?.compileOutput || latestSubmit?.primaryErrorType === 'COMPILATION_ERROR') {
            failureType = 'COMPILATION_ERROR';
          } else if (
            latestSubmit?.primaryErrorType === 'TIME_LIMIT_EXCEEDED' ||
            latestSubmit?.status === 'TIME_LIMIT_EXCEEDED' ||
            prob.candidateTimeComplexity?.includes('O(N^2)') ||
            prob.approachClassification === 'Suboptimal'
          ) {
            failureType = 'COMPLEXITY_TIMEOUT';
          } else {
            // Check if failure cases match boundary / edge case conditions
            const isEdgeCase = failedTCs.some((ftc) => {
              const inp = (ftc.input || '').trim();
              return (
                inp === '0' ||
                inp === '[]' ||
                inp === '""' ||
                inp === '-1' ||
                inp.startsWith('0') ||
                inp.includes('[]') ||
                inp.includes('null') ||
                inp.length <= 3
              );
            });
            if (isEdgeCase) {
              failureType = 'EDGE_CASE_FAILURE';
            }
          }

          evidenceItems.push({
            id: `ev-code-${inv.id}-${prob.questionId || qRefId}`,
            sourceType: 'CODING',
            sourceId: prob.questionId || qRefId,
            sessionId,
            interviewId: inv.id,
            interviewTitle: inv.title || 'Mock Interview',
            interviewDate: formattedDate,
            questionId: prob.questionId || qRefId,
            questionTitle: prob.title || `Coding Problem: ${prob.topic || 'Algorithms'}`,
            evidenceType: failureType,
            description: `${testsPassed}/${testsTotal} tests passed on final submission. ${
              failedTCs.length > 0 ? `${failedTCs.length} test case execution failures recorded.` : 'Execution error or incomplete solution.'
            }`,
            score: testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0,
            details: {
              attemptNumber: latestSubmit?.attemptNumber ?? prob.totalAttempts ?? 1,
              passedCount: testsPassed,
              totalCount: testsTotal,
              failedTestCases: failedTCs.slice(0, 5),
              compileOutput: latestSubmit?.compileOutput || prob.compileOutput || null,
              runtimeError: latestSubmit?.stderr || prob.runtimeError || null,
              primaryErrorType: latestSubmit?.primaryErrorType || null,
              submittedCodeSnippet: (latestSubmit?.sourceCode || prob.submittedCode || '').slice(0, 500),
              complexityIdentified: prob.candidateTimeComplexity || prob.expectedComplexity || null,
            },
          });
        }
      }

      // ── C. HR BEHAVIORAL EVIDENCE EXTRACTION ────────────────────────────────
      // Query HRInterviewSession and verified responses
      const hrSession = await (prisma as any).hRInterviewSession.findFirst({
        where: { interviewId: inv.id },
        include: {
          questions: {
            include: { response: true },
            orderBy: { sequence: 'asc' },
          },
          evaluation: true,
        },
      });

      if (hrSession && hrSession.questions) {
        hrSession.questions.forEach((qItem: any) => {
          const resp = qItem.response;
          if (!resp) return;

          // Prefer verified transcript over raw STT
          const transcriptToUse = resp.verifiedTranscript || resp.transcript || resp.rawTranscript || '';
          const dimScores = (resp.dimensionScores as Record<string, number>) || {};
          const starData = resp.starAnalysis as any;
          const score = resp.questionScore ?? 0;

          // Check for dimension weaknesses (< 6.5 / 10)
          const lowDimensions = Object.entries(dimScores).filter(([_, val]) => typeof val === 'number' && val < 6.5);

          // Check for STAR missing components
          const missingSTAR = starData?.missingComponents || [];

          if (score < 70 || lowDimensions.length > 0 || missingSTAR.length > 0) {
            let hrEvidenceType = 'LOW_DIMENSION_SCORE';
            if (missingSTAR.includes('Result')) {
              hrEvidenceType = 'MISSING_STAR_RESULT';
            } else if (dimScores.technicalDepth !== undefined && dimScores.technicalDepth < 6.0) {
              hrEvidenceType = 'LOW_TECHNICAL_DEPTH';
            } else if (dimScores.specificity !== undefined && dimScores.specificity < 6.0) {
              hrEvidenceType = 'LOW_SPECIFICITY';
            } else if (dimScores.structure !== undefined && dimScores.structure < 6.0) {
              hrEvidenceType = 'WEAK_STRUCTURE';
            }

            evidenceItems.push({
              id: `ev-hr-${inv.id}-${qItem.id}`,
              sourceType: 'HR',
              sourceId: qItem.id,
              sessionId,
              interviewId: inv.id,
              interviewTitle: inv.title || 'Mock Interview',
              interviewDate: formattedDate,
              questionId: qItem.id,
              questionTitle: qItem.question || `Behavioral: ${qItem.category || 'Interview'}`,
              evidenceType: hrEvidenceType,
              description: `Question score ${Math.round(score)}%. ${
                missingSTAR.length > 0 ? `Missing STAR components: ${missingSTAR.join(', ')}.` : ''
              } ${lowDimensions.length > 0 ? `Suboptimal dimensions: ${lowDimensions.map(([k, v]) => `${k} (${v}/10)`).join(', ')}.` : ''}`,
              score: Math.round(score),
              details: {
                questionText: qItem.question,
                verifiedTranscript: transcriptToUse,
                rawTranscript: resp.rawTranscript || null,
                starAnalysis: {
                  situation: starData?.situation?.present ?? true,
                  task: starData?.task?.present ?? true,
                  action: starData?.action?.present ?? true,
                  result: starData?.result?.present ?? false,
                  missingComponents: missingSTAR,
                },
                dimensionScores: dimScores,
                speechMetrics: resp.speechAnalysis || null,
              },
            });
          }
        });
      }

      // Compute round scores
      const overallScore = snap?.overallScore ?? snap?.overallProficiencyScore ?? null;
      const aptScore = snap?.stages?.aptitude?.scorePercentage ?? null;
      const codingScore = snap?.stages?.coding?.scorePercentage ?? null;
      const hrScore = hrSession?.overallScore ?? snap?.stages?.hr?.analysis?.overallScore ?? snap?.stages?.hr?.scorePercentage ?? null;

      completedInterviews.push({
        id: inv.id,
        title: inv.title || 'Mock Interview Session',
        interviewType: inv.interviewType || 'MOCK',
        createdAt: dateStr,
        finalizedAt: inv.session?.finalizedAt ? inv.session.finalizedAt.toISOString() : dateStr,
        overallScore: typeof overallScore === 'number' ? Math.round(overallScore) : null,
        aptitudeScore: typeof aptScore === 'number' ? Math.round(aptScore) : null,
        codingScore: typeof codingScore === 'number' ? Math.round(codingScore) : null,
        hrScore: typeof hrScore === 'number' ? Math.round(hrScore) : null,
        reportSnapshot: snap,
        evidenceItems,
      });
    }

    return {
      candidateId: identityId,
      interviews: completedInterviews,
      totalCompletedCount: completedInterviews.length,
    };
  }
}
