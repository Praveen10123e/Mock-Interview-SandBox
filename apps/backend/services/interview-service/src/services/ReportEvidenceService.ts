import { PrismaClient } from '../generated/client';
import { InterviewSessionService } from './InterviewSessionService';
import axios from 'axios';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

const QUESTION_BANK_URL = process.env.QUESTION_BANK_URL || 'http://localhost:3005';

export interface AptitudeQuestionEvidence {
  questionId: string;
  questionRefId?: string;
  questionNumber: number;
  question: string;
  title: string;
  topic: string;
  category: string | null;
  difficulty: string;
  options: string[];
  optionLabels: string[];
  selectedOptionIndex: number | null;
  selectedOptionText: string | null;
  correctOptionIndex: number;
  correctOptionText: string;
  isCorrect: boolean;
  status: 'CORRECT' | 'INCORRECT' | 'NOT_ATTEMPTED';
  storedExplanation: string | null;
  storedSolution: string | null;
  explanation?: string;
}

export interface CodingProblemEvidence {
  questionId: string;
  questionRefId?: string;
  title: string;
  topic: string;
  pattern?: string;
  description?: string;
  constraints?: string[];
  examples?: any[];
  difficulty: string;
  expectedComplexity: string;
  expectedSpaceComplexity?: string;
  totalTests: number;
  hasSubmitted: boolean;
  finalVerdict: string;
  finalScore: number;
  testsPassed: number;
  testsTotal: number;
  runCount: number;
  submitCount: number;
  totalAttempts: number;
  language: string;
  submittedCode: string | null;
  compileOutput: string | null;
  runtimeError: string | null;
  stdout?: string | null;
  stderr?: string | null;
  primaryErrorType?: string | null;
  executionTime: number | null;
  memory: number | null;
  testCaseResults: any[] | null;
  authoritativeTestCases?: any[];
  bestResult: {
    attemptNumber: number;
    passedCount: number;
    totalCount: number;
    status: string;
    score: number;
    verdictText: string;
  };
  attempts: CodingAttemptEvidence[];
  runHistory: Array<{
    attemptNumber: number;
    status: string;
    passedCount: number;
    totalCount: number;
    timestamp: string;
  }>;
  submitHistory: Array<{
    attemptNumber: number;
    status: string;
    passedCount: number;
    totalCount: number;
    compileOutput?: string | null;
    primaryErrorType?: string | null;
    timestamp: string;
  }>;
}

export interface CodingAttemptEvidence {
  submissionId: string;
  sessionId: string;
  problemId: string;
  attemptNumber: number;
  runMode: 'RUN' | 'SUBMIT';
  language: string;
  sourceCode: string | null;
  submittedAt: string;
  status: string;
  passedCount: number;
  failedCount: number;
  totalTests: number;
  executionTime: number | null;
  memory: number | null;
  compileError: string | null;
  runtimeError: string | null;
  testResults: Array<{
    testCaseId: string;
    status: string;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    executionTime?: number;
    error?: string | null;
    visible: true;
    passed: boolean;
  }>;
  aiAnalysis?: any;
}

export interface HRTurnEvidence {
  turnIndex: number;
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
}

export interface MonitoringEventItem {
  leftAt: string;
  returnedAt: string | null;
  durationSeconds: number;
}

export interface AssessmentMonitoringEvidence {
  status: 'Integrity Verified' | 'Review Recommended';
  monitoringStatus: 'Integrity Verified' | 'Review Recommended';
  totalSwitches: number;
  tabSwitches: number;
  totalAwaySeconds: number;
  totalTimeAwaySeconds: number;
  events: MonitoringEventItem[];
}

export interface CompleteSessionEvidence {
  interviewId: string;
  sessionId: string;
  candidateIdentityId: string;
  candidateName?: string;
  interviewTitle: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMinutes: number;
  completionReason?: string;
  monitoring: AssessmentMonitoringEvidence;
  aptitude: {
    totalQuestions: number;
    attemptedCount: number;
    correctCount: number;
    incorrectCount: number;
    scorePercentage: number;
    questions: AptitudeQuestionEvidence[];
    status: 'COMPLETED' | 'INCOMPLETE';
  };
  coding: {
    totalProblems: number;
    problemsAttempted: number;
    problemsSubmitted: number;
    problemsAccepted: number;
    totalRunCount: number;
    totalSubmitCount: number;
    totalTestsPassed: number;
    totalTestsCount: number;
    scorePercentage: number;
    problems: CodingProblemEvidence[];
    status: 'COMPLETED' | 'INCOMPLETE';
  };
  hr: {
    totalInteractions: number;
    candidateResponsesCount: number;
    status: 'COMPLETED' | 'NOT_ATTEMPTED';
    transcript: HRTurnEvidence[];
  };
}

export class ReportEvidenceService {
  /**
   * Collects all real database evidence for a specific interview session
   */
  static async collectEvidence(
    interviewId: string,
    identityId: string,
    telemetryOverride?: any,
    userRole?: string
  ): Promise<CompleteSessionEvidence> {
    const interview = await InterviewSessionService.getInterviewScoped(interviewId, identityId, userRole);
    const sessionId = interview.session?.id || interviewId;

    // 1. Fetch assigned questions
    const { aptitude, coding, hr } = await InterviewSessionService.getSessionQuestions(
      interviewId,
      identityId,
      userRole
    );

    // 2. Fetch all session history events
    const history = await prisma.interviewHistory.findMany({
      where: { interviewId },
      orderBy: { timestamp: 'asc' },
    });

    // 3. Fetch all execution records for this session
    const executionRecords = await prisma.interviewExecutionRecord.findMany({
      where: {
        sessionId: { in: [sessionId, interviewId].filter(Boolean) as string[] },
      },
      orderBy: { timestamp: 'asc' },
    });

    // ─── A. APTITUDE EVIDENCE COLLECTION ──────────────────────────────────────
    // Map of questionId -> selectedOptionIndex
    const candidateAnswers: Record<string, number> = {};

    // 1) From realtime answer save events
    history.forEach((h) => {
      if (h.event === 'APTITUDE_ANSWER_SAVE' && h.details) {
        const d = h.details as any;
        if (d.questionId && typeof d.selectedOptionIndex === 'number') {
          candidateAnswers[d.questionId] = d.selectedOptionIndex;
        }
      }
    });

    // 2) From aptitude submit event
    const aptSubmitEvent = history.find((h) => h.event === 'APTITUDE_SUBMIT');
    if (aptSubmitEvent?.details) {
      const d = aptSubmitEvent.details as any;
      if (d.answers && typeof d.answers === 'object') {
        Object.entries(d.answers).forEach(([qId, val]) => {
          if (typeof val === 'number') candidateAnswers[qId] = val;
        });
      }
    }

    if (telemetryOverride?.aptitude?.answers) {
      Object.entries(telemetryOverride.aptitude.answers).forEach(([qId, val]) => {
        if (typeof val === 'number') candidateAnswers[qId] = val;
      });
    }

    let aptCorrectCount = 0;
    let aptAttemptedCount = 0;
    const aptitudeQuestionsEvidence: AptitudeQuestionEvidence[] = [];

    let questionCounter = 0;
    for (const q of aptitude) {
      questionCounter++;
      const jsonPayload = q.metadata?.jsonPayload || (typeof q.metadata === 'string' ? JSON.parse(q.metadata) : {}) || {};

      // 1. Authoritative options
      let options: string[] = [];
      if (Array.isArray(q.options) && q.options.length > 0) {
        options = q.options;
      } else if (Array.isArray(jsonPayload.options) && jsonPayload.options.length > 0) {
        options = jsonPayload.options;
      } else if (Array.isArray(q.metadata?.options) && q.metadata.options.length > 0) {
        options = q.metadata.options;
      }

      // If still missing, check options inside jsonPayload or q.metadata
      if (options.length === 0 && Array.isArray((q as any).answers)) {
        options = (q as any).answers;
      }

      // If absolutely no options, fallback to standard letter options only as last resort
      if (options.length === 0) {
        options = ['Option A', 'Option B', 'Option C', 'Option D'];
      }

      // 2. Authoritative correct option index
      let correctIdx = 0;
      if (typeof q.correctOptionIndex === 'number') {
        correctIdx = q.correctOptionIndex;
      } else if (typeof jsonPayload.correctOptionIndex === 'number') {
        correctIdx = jsonPayload.correctOptionIndex;
      } else if (typeof q.correctAnswer === 'number') {
        correctIdx = q.correctAnswer;
      }

      // Bounds safety
      if (correctIdx < 0 || correctIdx >= options.length) {
        correctIdx = 0;
      }

      const optionLabels: string[] = options.map((_, idx) => String.fromCharCode(65 + idx));
      const selectedIdx = candidateAnswers[q.id] !== undefined ? candidateAnswers[q.id] : null;

      if (selectedIdx !== null) aptAttemptedCount++;

      const isCorrect = selectedIdx !== null && selectedIdx === correctIdx;
      if (isCorrect) aptCorrectCount++;

      const status: 'CORRECT' | 'INCORRECT' | 'NOT_ATTEMPTED' = 
        selectedIdx === null ? 'NOT_ATTEMPTED' : (isCorrect ? 'CORRECT' : 'INCORRECT');

      const fullQuestionText = q.description || q.question || q.title || 'Aptitude Question';
      const rawExplanation = q.explanation || q.storedExplanation || q.explanations?.[0]?.content || jsonPayload.explanation || q.metadata?.explanation || null;
      const rawSolution = q.solution || q.storedSolution || jsonPayload.solution || null;

      const correctOptionText = options[correctIdx] || options[0] || 'Option A';
      const selectedOptionText = selectedIdx !== null && options[selectedIdx] !== undefined ? options[selectedIdx] : null;

      aptitudeQuestionsEvidence.push({
        questionId: q.id,
        questionRefId: q.questionRefId || q.id,
        questionNumber: questionCounter,
        question: fullQuestionText,
        title: q.title || fullQuestionText,
        topic: typeof q.topic === 'string' ? q.topic : (q.topic?.name || 'Aptitude'),
        category: q.category || (typeof q.topic === 'string' ? q.topic : (q.topic?.name || 'Quantitative Aptitude')),
        difficulty: q.difficulty || 'Medium',
        options,
        optionLabels,
        selectedOptionIndex: selectedIdx,
        selectedOptionText,
        correctOptionIndex: correctIdx,
        correctOptionText,
        isCorrect,
        status,
        storedExplanation: rawExplanation,
        storedSolution: rawSolution,
        explanation: rawExplanation || rawSolution || `The correct mathematical/logical solution corresponds to Option ${optionLabels[correctIdx]} (${correctOptionText}).`,
      });
    }

    const aptTotalQuestions = aptitude.length || 5;
    const aptScorePercentage = aptTotalQuestions > 0 ? Math.round((aptCorrectCount / aptTotalQuestions) * 100) : 0;

    // ─── B. CODING EVIDENCE COLLECTION ────────────────────────────────────────
    let totalRunCount = 0;
    let totalSubmitCount = 0;
    let totalTestsPassedSum = 0;
    let totalTestsCountSum = 0;
    let problemsAcceptedCount = 0;
    const codingProblemsEvidence: CodingProblemEvidence[] = [];

    for (const q of coding) {
      const qRecords = executionRecords.filter(
        (r) => r.questionRefId === q.id || r.questionTitle === q.title
      );

      const runs = qRecords.filter((r) => r.runMode === 'RUN');
      const submits = qRecords.filter((r) => r.runMode === 'SUBMIT');

      totalRunCount += runs.length;
      totalSubmitCount += submits.length;

      // 1. Authoritative test cases & complexity
      const expectedComplexity = q.expectedComplexity || q.timeComplexity || q.metadata?.jsonPayload?.timeComplexity || (q.difficulty === 'EASY' ? 'O(n)' : 'O(n log n)');
      const expectedSpaceComplexity = q.expectedSpaceComplexity || q.spaceComplexity || q.metadata?.jsonPayload?.spaceComplexity || 'O(1)';
      const pattern = q.pattern || q.metadata?.jsonPayload?.pattern || (typeof q.topic === 'string' ? q.topic : 'Algorithms');
      const description = q.description || q.metadata?.jsonPayload?.description || '';
      const constraints = Array.isArray(q.constraints) ? q.constraints : (Array.isArray(q.metadata?.jsonPayload?.constraints) ? q.metadata.jsonPayload.constraints : []);
      const examples = Array.isArray(q.examples) ? q.examples : (Array.isArray(q.metadata?.jsonPayload?.examples) ? q.metadata.jsonPayload.examples : []);
      const authoritativeTestCases = Array.isArray(q.testCases) ? q.testCases : (Array.isArray(q.metadata?.jsonPayload?.testCases) ? q.metadata.jsonPayload.testCases : []);

      // 2. Deterministic Best Result Calculation (highest passedCount, tie-breaker: latest attempt)
      // Only official SUBMIT records count as candidate submission attempts
      const candidateRecords = submits;
      let bestAttempt = candidateRecords.length > 0 ? candidateRecords[0] : null;
      for (const att of candidateRecords) {
        if (!bestAttempt) {
          bestAttempt = att;
        } else if (att.passedCount > bestAttempt.passedCount) {
          bestAttempt = att;
        } else if (att.passedCount === bestAttempt.passedCount) {
          if (att.attemptNumber >= bestAttempt.attemptNumber) {
            bestAttempt = att;
          }
        }
      }

      const latestSubmit = submits.length > 0 ? submits[submits.length - 1] : null;
      const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;
      const latestRecord = latestSubmit || latestRun;

      const testsPassed = bestAttempt ? bestAttempt.passedCount : 0;
      const testsTotal = bestAttempt
        ? bestAttempt.totalCount
        : (Array.isArray(authoritativeTestCases) && authoritativeTestCases.length > 0 ? authoritativeTestCases.length : 0);

      totalTestsPassedSum += testsPassed;
      totalTestsCountSum += testsTotal;

      let finalVerdict = 'NOT_ATTEMPTED';
      if (bestAttempt) {
        finalVerdict = bestAttempt.status || (bestAttempt.passedCount === bestAttempt.totalCount && bestAttempt.totalCount > 0 ? 'ACCEPTED' : 'WRONG_ANSWER');
        if (finalVerdict === 'ACCEPTED' || finalVerdict === 'PASSED' || (bestAttempt.passedCount === bestAttempt.totalCount && bestAttempt.totalCount > 0)) {
          problemsAcceptedCount++;
          finalVerdict = 'ACCEPTED';
        }
      }

      const bestResult = bestAttempt ? {
        attemptNumber: bestAttempt.attemptNumber,
        passedCount: bestAttempt.passedCount,
        totalCount: bestAttempt.totalCount,
        status: finalVerdict,
        score: bestAttempt.score,
        verdictText: `${bestAttempt.passedCount}/${bestAttempt.totalCount}`,
      } : {
        attemptNumber: 0,
        passedCount: 0,
        totalCount: testsTotal,
        status: 'NOT_ATTEMPTED',
        score: 0,
        verdictText: `0/${testsTotal}`,
      };

      // 3. Compile full immutable attempts history
      const attempts: CodingAttemptEvidence[] = candidateRecords.map((att) => {
        const rawResults = Array.isArray(att.testCaseResults) ? att.testCaseResults : [];
        const authTCs = Array.isArray(authoritativeTestCases) ? authoritativeTestCases : [];

        const formattedTestResults = rawResults.length > 0 ? rawResults.map((r: any, idx: number) => {
          const matchingAuth = authTCs[idx] || authTCs.find((a: any) => (a.id || a.testCaseId) === r.testCaseId);
          const input = r.input ?? matchingAuth?.input ?? '';
          const expectedOutput = r.expectedOutput ?? r.expected ?? matchingAuth?.expectedOutput ?? '';
          const actualOutput = r.actualOutput ?? r.actual ?? r.studentOutput ?? (r.passed ? expectedOutput : (r.stderr || ''));
          const error = !r.passed ? (r.stderr || r.error || (r.status === 'RUNTIME_ERROR' ? 'Runtime Exception' : null)) : null;

          return {
            testCaseId: r.testCaseId || `${q.id}-tc-${idx + 1}`,
            status: r.status || (r.passed ? 'ACCEPTED' : 'WRONG_ANSWER'),
            input: typeof input === 'string' ? input : JSON.stringify(input),
            expectedOutput: typeof expectedOutput === 'string' ? expectedOutput : JSON.stringify(expectedOutput),
            actualOutput: typeof actualOutput === 'string' ? actualOutput : (actualOutput != null ? JSON.stringify(actualOutput) : ''),
            executionTime: typeof r.executionTime === 'number' ? r.executionTime : (parseFloat(r.time) || 0),
            error,
            visible: true as const,
            passed: Boolean(r.passed),
          };
        }) : authTCs.map((tc: any, idx: number) => ({
          testCaseId: tc.testCaseId || tc.id || `${q.id}-tc-${idx + 1}`,
          status: att.passedCount === att.totalCount && att.totalCount > 0 ? 'ACCEPTED' : 'FAILED',
          input: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input),
          expectedOutput: typeof tc.expectedOutput === 'string' ? tc.expectedOutput : JSON.stringify(tc.expectedOutput),
          actualOutput: att.compileOutput ? 'Compilation Error' : (att.stderr || ''),
          executionTime: att.executionTime || 0,
          error: att.compileOutput || att.stderr || null,
          visible: true as const,
          passed: false,
        }));

        return {
          submissionId: att.id,
          sessionId: att.sessionId,
          problemId: q.id,
          attemptNumber: att.attemptNumber,
          runMode: att.runMode as 'RUN' | 'SUBMIT',
          language: att.language,
          sourceCode: att.sourceCode,
          submittedAt: att.timestamp.toISOString(),
          status: att.status,
          passedCount: att.passedCount,
          failedCount: Math.max(0, att.totalCount - att.passedCount),
          totalTests: att.totalCount,
          executionTime: att.executionTime,
          memory: att.memory,
          compileError: att.compileOutput,
          runtimeError: att.primaryErrorType === 'RUNTIME_ERROR' ? (att.stderr || 'Runtime error') : null,
          testResults: formattedTestResults,
          aiAnalysis: (att as any).aiAnalysis || null,
        };
      });

      // Compile and runtime errors
      let compileOutput = latestRecord?.compileOutput || null;
      let runtimeError = null;
      if (latestRecord?.primaryErrorType === 'RUNTIME_ERROR' || latestRecord?.stderr) {
        runtimeError = latestRecord.stderr || 'Runtime Exception occurred during execution.';
      }

      codingProblemsEvidence.push({
        questionId: q.id,
        title: q.title || 'Coding Problem',
        topic: typeof q.topic === 'string' ? q.topic : (q.topic?.name || 'Algorithms'),
        pattern,
        description,
        constraints,
        examples,
        difficulty: q.difficulty || 'Medium',
        expectedComplexity,
        expectedSpaceComplexity,
        totalTests: testsTotal,
        hasSubmitted: submits.length > 0,
        finalVerdict,
        finalScore: latestSubmit?.score || 0,
        testsPassed,
        testsTotal,
        runCount: runs.length,
        submitCount: submits.length,
        totalAttempts: submits.length,
        language: latestRecord?.language || 'Python',
        submittedCode: latestSubmit?.sourceCode || latestRun?.sourceCode || null,
        compileOutput,
        runtimeError,
        stdout: latestRecord?.stdout || null,
        stderr: latestRecord?.stderr || null,
        primaryErrorType: latestRecord?.primaryErrorType || null,
        executionTime: latestRecord?.executionTime || null,
        memory: latestRecord?.memory || null,
        testCaseResults: (latestRecord?.testCaseResults as any[]) || null,
        authoritativeTestCases,
        bestResult,
        attempts,
        runHistory: runs.map((r) => ({
          attemptNumber: r.attemptNumber,
          status: r.status,
          passedCount: r.passedCount,
          totalCount: r.totalCount,
          timestamp: r.timestamp.toISOString(),
        })),
        submitHistory: submits.map((s) => ({
          attemptNumber: s.attemptNumber,
          status: s.status,
          passedCount: s.passedCount,
          totalCount: s.totalCount,
          compileOutput: s.compileOutput,
          primaryErrorType: s.primaryErrorType,
          timestamp: s.timestamp.toISOString(),
        })),
      });
    }

    const codingScorePercentage =
      totalTestsCountSum > 0
        ? Math.round((totalTestsPassedSum / totalTestsCountSum) * 100)
        : problemsAcceptedCount === coding.length && coding.length > 0
        ? 100
        : 0;

    // ─── C. HR EVIDENCE COLLECTION ────────────────────────────────────────────
    const hrEvents = history.filter(
      (h) => h.event === 'HR_MESSAGE' || h.event === 'HR_CONVERSATION_UPDATE'
    );
    const hrCompleteEvent = history.find((h) => h.event === 'HR_COMPLETE');

    const transcript: HRTurnEvidence[] = [];
    hrEvents.forEach((ev, idx) => {
      const d = ev.details as any;
      if (d && d.content) {
        transcript.push({
          turnIndex: d.turnIndex ?? idx,
          role: d.role === 'interviewer' || d.role === 'ai' ? 'interviewer' : 'candidate',
          content: String(d.content),
          timestamp: ev.timestamp.toISOString(),
        });
      }
    });

    const hrSession = await (prisma as any).hRInterviewSession.findUnique({
      where: { interviewId },
      include: {
        questions: {
          include: { response: true },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (transcript.length === 0 && hrSession?.questions) {
      hrSession.questions.forEach((q: any, idx: number) => {
        transcript.push({
          turnIndex: idx * 2,
          role: 'interviewer',
          content: q.question,
          timestamp: q.createdAt ? q.createdAt.toISOString() : new Date().toISOString(),
        });
        if (q.response?.verifiedTranscript || q.response?.transcript) {
          transcript.push({
            turnIndex: idx * 2 + 1,
            role: 'candidate',
            content: q.response.verifiedTranscript || q.response.transcript,
            timestamp: q.response.submittedAt ? q.response.submittedAt.toISOString() : new Date().toISOString(),
          });
        }
      });
    }

    const candidateResponsesCount = transcript.filter((t) => t.role === 'candidate').length;
    const hrCompleted = !!hrCompleteEvent || hrSession?.status === 'COMPLETED' || candidateResponsesCount >= 1;

    // ─── D. DURATION & TIMING ─────────────────────────────────────────────────
    const startedAt = interview.session?.startedAt ? interview.session.startedAt.toISOString() : interview.createdAt.toISOString();
    const finishedAt = interview.session?.finishedAt ? interview.session.finishedAt.toISOString() : new Date().toISOString();
    const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    // ─── E. ASSESSMENT INTEGRITY & MONITORING EVIDENCE ────────────────────────
    const tabSwitchRecords = await (prisma as any).interviewTabSwitchEvent.findMany({
      where: {
        OR: [
          { interviewId },
          { sessionId },
        ],
      },
      orderBy: { leftAt: 'asc' },
    });

    const monitoringEvents: MonitoringEventItem[] = tabSwitchRecords.map((ev: any) => ({
      leftAt: ev.leftAt.toISOString(),
      returnedAt: ev.returnedAt ? ev.returnedAt.toISOString() : null,
      durationSeconds: ev.durationSeconds || 0,
    }));

    const completedEvents = monitoringEvents.filter(
      (ev) => ev.leftAt != null && ev.returnedAt != null
    );

    const totalSwitches = completedEvents.length;
    const totalAwaySeconds = completedEvents.reduce(
      (sum, e) => sum + (e.durationSeconds || 0),
      0
    );

    const monitoringStatus: 'Integrity Verified' | 'Review Recommended' =
      totalSwitches > 2 || totalAwaySeconds > 30
        ? 'Review Recommended'
        : 'Integrity Verified';

    return {
      interviewId,
      sessionId,
      candidateIdentityId: identityId,
      interviewTitle: interview.title,
      startedAt,
      finishedAt,
      durationMinutes,
      completionReason: interview.session?.completionReason || undefined,
      monitoring: {
        status: monitoringStatus,
        monitoringStatus,
        totalSwitches,
        tabSwitches: totalSwitches,
        totalAwaySeconds,
        totalTimeAwaySeconds: totalAwaySeconds,
        events: completedEvents,
      },
      aptitude: {
        totalQuestions: aptTotalQuestions,
        attemptedCount: aptAttemptedCount,
        correctCount: aptCorrectCount,
        incorrectCount: Math.max(0, aptTotalQuestions - aptCorrectCount),
        scorePercentage: aptScorePercentage,
        questions: aptitudeQuestionsEvidence,
        status: aptAttemptedCount > 0 ? 'COMPLETED' : 'INCOMPLETE',
      },
      coding: {
        totalProblems: coding.length || 2,
        problemsAttempted: codingProblemsEvidence.filter((p) => p.totalAttempts > 0).length,
        problemsSubmitted: codingProblemsEvidence.filter((p) => p.hasSubmitted).length,
        problemsAccepted: problemsAcceptedCount,
        totalRunCount,
        totalSubmitCount,
        totalTestsPassed: totalTestsPassedSum,
        totalTestsCount: totalTestsCountSum,
        scorePercentage: codingScorePercentage,
        problems: codingProblemsEvidence,
        status: codingProblemsEvidence.every((p) => p.hasSubmitted) ? 'COMPLETED' : 'INCOMPLETE',
      },
      hr: {
        totalInteractions: transcript.length,
        candidateResponsesCount,
        status: hrCompleted ? 'COMPLETED' : 'NOT_ATTEMPTED',
        transcript,
      },
    };
  }
}
