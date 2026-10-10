/**
 * HRInterviewService.ts — Full HR Session Lifecycle Manager
 *
 * Manages the complete HR behavioral interview flow:
 *  - Session initialization with curated AI-selected questions
 *  - Turn-by-turn response submission with LLM follow-up generation
 *  - 10-factor behavioral evaluation via InterviewAIService
 *  - Final score aggregation integrated into ReportAnalysisService
 */

import { PrismaClient } from '../generated/client';
import { InterviewSessionService } from './InterviewSessionService';
import { InterviewAIService } from './InterviewAIService';
import { HRMessage } from '../types/interviewTypes';
import { HRTranscriptValidator } from './HRTranscriptValidator';
import { HRScoreEngine } from './HRScoreEngine';
import { HRSpeechAnalyzer } from './HRSpeechAnalyzer';
import { HRInterviewSummaryGenerator } from './HRInterviewSummaryGenerator';
import { InterviewMediaService } from './InterviewMediaService';
import path from 'path';
import fs from 'fs';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

const RECORDINGS_BASE = path.join(process.cwd(), 'uploads', 'recordings');

export class HRInterviewService {
  // ─── 1. Initialize or Fetch HR Session ────────────────────────────────────────

  /**
   * Initialize or resume the HR session for an interview.
   * Returns the HR session with all questions pre-populated.
   */
  static async initSession(interviewId: string, identityId: string, role = 'Software Engineer') {
    await InterviewSessionService.getInterviewScoped(interviewId, identityId);

    // Check for existing HR session
    const existing = await (prisma as any).hRInterviewSession.findUnique({
      where: { interviewId },
      include: {
        questions: {
          include: { response: true },
          orderBy: { sequence: 'asc' },
        },
        evaluation: true,
      },
    });

    if (existing) {
      return this.formatSession(existing);
    }

    // Select questions for this session
    const selectedQuestions = InterviewAIService.selectSessionQuestions(3);

    // Create HR session and questions in DB
    const hrSession = await (prisma as any).hRInterviewSession.create({
      data: {
        interviewId,
        position: role,
        status: 'READY',
        questions: {
          create: selectedQuestions.map((q, idx) => ({
            question: q.question,
            category: q.category,
            questionType: 'MAIN',
            sequence: idx + 1,
            difficulty: q.difficulty || (idx === 0 ? 'easy' : 'medium'),
            competency: q.competency || (idx === 0 ? 'communication' : null),
            selectionReason: idx === 0 ? 'Standard introductory question' : 'Initial session question pool',
          })),
        },
      },
      include: {
        questions: {
          include: { response: true },
          orderBy: { sequence: 'asc' },
        },
        evaluation: true,
      },
    });

    // Record initialization in InterviewHistory
    await prisma.interviewHistory.create({
      data: {
        interviewId,
        event: 'HR_SESSION_INIT',
        details: {
          hrSessionId: hrSession.id,
          questionCount: selectedQuestions.length,
          position: role,
        } as any,
      },
    });

    return this.formatSession(hrSession);
  }

  // ─── 2. Start Session ─────────────────────────────────────────────────────────

  static async startSession(interviewId: string, identityId: string) {
    await InterviewSessionService.requireActiveSession(interviewId, identityId);

    const hrSession = await this.requireHRSession(interviewId);

    await (prisma as any).hRInterviewSession.update({
      where: { id: hrSession.id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    await prisma.interviewHistory.create({
      data: {
        interviewId,
        event: 'HR_SESSION_START',
        details: { hrSessionId: hrSession.id } as any,
      },
    });

    return { success: true, status: 'IN_PROGRESS' };
  }

  // ─── 3. Submit Response & Get Follow-Up ───────────────────────────────────────

  /**
   * Submit a candidate response for a given question.
   * Evaluates the response and generates the next question (follow-up or main).
   */
  static async submitResponse(
    interviewId: string,
    identityId: string,
    questionId: string,
    transcript: string,
    durationSeconds: number
  ) {
    await InterviewSessionService.requireActiveSession(interviewId, identityId);

    const hrSession = await this.requireHRSession(interviewId);
    const question = await (prisma as any).hRInterviewQuestion.findFirst({
      where: { id: questionId, hrSessionId: hrSession.id },
    });

    if (!question) {
      throw Object.assign(new Error('Question not found in this HR session.'), { statusCode: 404 });
    }

    // 1. Feature A: Context-Aware Transcript Verification
    const verification = HRTranscriptValidator.verifyTranscript(transcript, {
      currentQuestion: question.question,
      category: question.category,
    });

    const storedTranscript = verification.verifiedTranscript;
    const wordCount = verification.wordCount;

    // 2. Feature B & Feature C: HR Response Quality Evaluation & Deterministic Scoring
    const evaluation = await InterviewAIService.evaluateResponseQuality(
      question.question,
      storedTranscript,
      question.category,
      durationSeconds
    );

    // 3. Feature D: STAR Format Detection & Coaching Analysis
    const starAnalysis = await InterviewAIService.analyzeSTAR(
      question.question,
      storedTranscript,
      question.category
    );

    // 4. Feature E: Phase 3 Speech Pattern & Filler Word Intelligence
    let speechAnalysis: any = null;
    try {
      speechAnalysis = await HRSpeechAnalyzer.analyze(
        storedTranscript,
        verification.rawTranscript,
        durationSeconds,
        verification.uncertainSegments || []
      );
    } catch (speechErr) {
      console.warn('Speech pattern analysis error (continuing without blocking interview):', speechErr);
      speechAnalysis = {
        metadata: {
          analysisVersion: '1.0',
          model: 'error-fallback',
          promptVersion: 'hr-speech-v1',
          generatedAt: new Date().toISOString(),
          status: 'failed',
        },
      };
    }

    // 5. Save or update the response with full evidence retention
    await (prisma as any).hRInterviewResponse.upsert({
      where: { questionId },
      create: {
        hrSessionId: hrSession.id,
        questionId,
        transcript: storedTranscript,
        rawTranscript: verification.rawTranscript,
        verifiedTranscript: verification.verifiedTranscript,
        corrections: verification.corrections,
        uncertainSegments: verification.uncertainSegments,
        dimensionScores: evaluation.dimensionScores,
        questionScore: evaluation.overallScore,
        justification: evaluation.justification,
        strengths: evaluation.strengths,
        areasForImprovement: evaluation.areasForImprovement,
        starFormatDetected: evaluation.starFormatDetected,
        starAnalysis: starAnalysis as any,
        speechAnalysis: speechAnalysis as any,
        responseQuality: evaluation.responseQuality,
        evaluationStatus: evaluation.metadata.status,
        analysisMetadata: evaluation.metadata,
        durationSeconds,
        wordCount,
      },
      update: {
        transcript: storedTranscript,
        rawTranscript: verification.rawTranscript,
        verifiedTranscript: verification.verifiedTranscript,
        corrections: verification.corrections,
        uncertainSegments: verification.uncertainSegments,
        dimensionScores: evaluation.dimensionScores,
        questionScore: evaluation.overallScore,
        justification: evaluation.justification,
        strengths: evaluation.strengths,
        areasForImprovement: evaluation.areasForImprovement,
        starFormatDetected: evaluation.starFormatDetected,
        starAnalysis: starAnalysis as any,
        speechAnalysis: speechAnalysis as any,
        responseQuality: evaluation.responseQuality,
        evaluationStatus: evaluation.metadata.status,
        analysisMetadata: evaluation.metadata,
        durationSeconds,
        wordCount,
        submittedAt: new Date(),
      },
    });

    // Log in interview history with full auditability (both raw and verified transcripts)
    await prisma.interviewHistory.create({
      data: {
        interviewId,
        event: 'HR_MESSAGE',
        details: {
          role: 'candidate',
          content: storedTranscript,
          rawTranscript: verification.rawTranscript,
          verifiedTranscript: verification.verifiedTranscript,
          isEmpty: verification.isEmpty,
          isFillerOnly: verification.isFillerOnly,
          isNonResponsive: verification.isNonResponsive,
          normalizedTerms: verification.normalizedTerms,
          rejectionReason: verification.rejectionReason,
          questionId,
          durationSeconds,
        } as any,
      },
    });

    // Generate contextual follow-up via AI
    const followUpText = await InterviewAIService.generateFollowUp(
      question.question,
      question.category,
      storedTranscript,
      'Software Engineer'
    );

    // Determine if there's a next main question
    const allQuestions = await (prisma as any).hRInterviewQuestion.findMany({
      where: { hrSessionId: hrSession.id },
      include: { response: true },
      orderBy: { sequence: 'asc' },
    });

    const currentIdx = allQuestions.findIndex((q: any) => q.id === questionId);
    let nextMain = allQuestions.find((q: any) => q.questionType === 'MAIN' && !q.response && q.id !== questionId);
    const answeredCount = allQuestions.filter((q: any) => q.questionType === 'MAIN' && (q.id === questionId || q.response)).length;
    const totalMain = allQuestions.filter((q: any) => q.questionType === 'MAIN').length;
    const isLastQuestion = !nextMain;

    // Feature E: Adaptive Next-Question Selector (Rule-driven progression)
    if (nextMain && answeredCount < totalMain) {
      const answeredQuestions = allQuestions.filter((q: any) => q.questionType === 'MAIN' && (q.id === questionId || q.response));
      const testedCompetencies = answeredQuestions
        .map((q: any) => q.competency)
        .filter(Boolean) as string[];

      const existingQuestionTexts = new Set(allQuestions.map((q: any) => q.question.trim().toLowerCase()));
      const bank = InterviewAIService.getQuestionBank();
      const usedBankIds = bank
        .filter((b) => existingQuestionTexts.has(b.question.trim().toLowerCase()))
        .map((b) => b.id);

      const adaptiveInput = {
        previousQuestion: question.question,
        previousQuestionId: question.id,
        previousScore: evaluation.overallScore, // Authoritative deterministic score from HRScoreEngine!
        responseQuality: evaluation.responseQuality,
        previousCompetencies: testedCompetencies,
        usedQuestionIds: usedBankIds,
      };

      const adaptiveSelection = await InterviewAIService.selectAdaptiveNextQuestion(adaptiveInput);

      if (adaptiveSelection && !existingQuestionTexts.has(adaptiveSelection.nextQuestionText.trim().toLowerCase())) {
        // Persist the adaptive selection directly in the database slot for the next question
        nextMain = await (prisma as any).hRInterviewQuestion.update({
          where: { id: nextMain.id },
          data: {
            question: adaptiveSelection.nextQuestionText,
            category: adaptiveSelection.category,
            difficulty: adaptiveSelection.difficulty,
            competency: adaptiveSelection.competency,
            selectionReason: adaptiveSelection.reasoning,
          },
        });
      }
    }

    // Create follow-up question record (unless last question)
    let followUpQuestion: any = null;
    if (!isLastQuestion || answeredCount < totalMain) {
      followUpQuestion = await (prisma as any).hRInterviewQuestion.create({
        data: {
          hrSessionId: hrSession.id,
          question: followUpText,
          category: question.category,
          questionType: 'FOLLOW_UP',
          sequence: allQuestions.length + 1,
          isFollowUpToId: questionId,
        },
      });

      await prisma.interviewHistory.create({
        data: {
          interviewId,
          event: 'HR_MESSAGE',
          details: { role: 'interviewer', content: followUpText, questionId: followUpQuestion.id } as any,
        },
      });
    }

    return {
      success: true,
      followUpQuestion: followUpQuestion
        ? { id: followUpQuestion.id, question: followUpText, category: question.category, questionType: 'FOLLOW_UP' }
        : null,
      nextMainQuestion: nextMain
        ? {
            id: nextMain.id,
            question: nextMain.question,
            category: nextMain.category,
            sequence: nextMain.sequence,
            difficulty: nextMain.difficulty || 'medium',
            competency: nextMain.competency,
            selectionReason: nextMain.selectionReason,
          }
        : null,
      canComplete: answeredCount >= totalMain - 1,
      progress: {
        answered: answeredCount,
        total: totalMain,
        percentage: Math.round((answeredCount / totalMain) * 100),
      },
    };
  }

  // ─── 4. Save Recording Path ───────────────────────────────────────────────────

  static async saveRecordingPath(hrSessionId: string, questionId: string, relativePath: string) {
    await (prisma as any).hRInterviewResponse.update({
      where: { questionId },
      data: { recordingPath: relativePath },
    });
    return { success: true };
  }

  // ─── 5. Delete Recording ──────────────────────────────────────────────────────

  static async deleteRecording(interviewId: string, identityId: string, responseId: string) {
    await InterviewSessionService.getInterviewScoped(interviewId, identityId);

    const response = await (prisma as any).hRInterviewResponse.findUnique({ where: { id: responseId } });
    if (!response) throw Object.assign(new Error('Recording not found.'), { statusCode: 404 });

    if (response.recordingPath) {
      const fullPath = path.join(RECORDINGS_BASE, response.recordingPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await (prisma as any).hRInterviewResponse.update({
      where: { id: responseId },
      data: { recordingPath: null },
    });

    return { success: true };
  }

  // ─── 6. Complete HR Round & Evaluate ─────────────────────────────────────────

  /**
   * Finalize the HR session: aggregate all responses, run 10-factor AI evaluation,
   * store results in HRInterviewEvaluation, and sync with InterviewHistory for
   * ReportAnalysisService pickup.
   */
  static async completeHR(interviewId: string, identityId: string) {
    await InterviewSessionService.requireActiveSession(interviewId, identityId);

    const hrSession = await this.requireHRSession(interviewId);

    if (hrSession.status === 'COMPLETED') {
      return this.getReport(interviewId, identityId);
    }

    // Mark as analyzing
    await (prisma as any).hRInterviewSession.update({
      where: { id: hrSession.id },
      data: { status: 'ANALYZING' },
    });

    // Fetch ALL questions (MAIN + FOLLOW_UP) with their responses for multi-turn context
    const allQuestionsWithResponses = await (prisma as any).hRInterviewQuestion.findMany({
      where: { hrSessionId: hrSession.id },
      include: { response: true },
      orderBy: { sequence: 'asc' },
    });

    const mainQuestions = allQuestionsWithResponses.filter((q: any) => q.questionType === 'MAIN');
    const followUpQuestions = allQuestionsWithResponses.filter((q: any) => q.questionType === 'FOLLOW_UP');

    // Aggregate FOLLOW_UP responses into their parent MAIN question for multi-turn evaluation.
    // This ensures "Python project" + "Python for backend and React for frontend" are
    // combined and evaluated as one coherent answer against the parent question's rubric.
    const questionsToEvaluate = mainQuestions.map((mainQ: any) => {
      const mainTranscript = (mainQ.response?.transcript || '').trim();
      const mainDuration = (mainQ.response?.durationSeconds || 0) as number;

      // Collect all follow-up responses for this parent question
      const followUps = followUpQuestions.filter(
        (fu: any) => fu.isFollowUpToId === mainQ.id && fu.response?.transcript
      );

      // Build a combined transcript that includes main + all follow-up candidate turns.
      // Skip placeholder/empty/silence strings so they don't pollute the combined text.
      const silencePlaceholders = [
        '[candidate audio response recorded]',
        '[candidate audio response]',
        '[no speech]',
        '[no speech detected]',
      ];

      const allTurns: string[] = [];
      if (mainTranscript && !silencePlaceholders.some(p => mainTranscript.toLowerCase() === p)) {
        allTurns.push(mainTranscript);
      }
      for (const fu of followUps) {
        const fuText = (fu.response.transcript || '').trim();
        if (fuText && !silencePlaceholders.some(p => fuText.toLowerCase() === p)) {
          allTurns.push(fuText);
        }
      }

      const combinedTranscript = allTurns.join(' ');
      const totalDuration = mainDuration + followUps.reduce(
        (sum: number, fu: any) => sum + (fu.response?.durationSeconds || 0), 0
      );

      return {
        question: mainQ.question,
        category: mainQ.category,
        transcript: combinedTranscript,
        durationSeconds: totalDuration,
      };
    });

    // Run holistic AI evaluation across all main questions (with combined multi-turn context)
    const evaluation = await InterviewAIService.evaluateFinalSession(
      questionsToEvaluate.length > 0
        ? questionsToEvaluate
        : [{ question: 'General Introduction', category: 'Self Introduction', transcript: '', durationSeconds: 0 }]
    );

    // Feature C: Authoritative Deterministic Score Calculation
    // Extract question scores from stored responses
    const questionScores = mainQuestions.map((q: any) => {
      if (q.response && typeof q.response.questionScore === 'number') {
        return q.response.questionScore;
      }
      return 0;
    });

    const authoritativeOverallScore = HRScoreEngine.calculateOverallHRScore(
      questionScores.length > 0 ? questionScores : [0]
    );

    const roundedOfficial = Math.round(authoritativeOverallScore);

    // Compute dimension averages directly from stored response dimensions
    const responseDims = mainQuestions
      .map((q: any) => q.response?.dimensionScores)
      .filter((d: any) => d && typeof d === 'object');
    const avgDims = HRScoreEngine.calculateAverageDimensionScores(responseDims);

    // Authoritative backend score overrides LLM guess across all fields
    evaluation.overallScore = authoritativeOverallScore;
    evaluation.communicationScore = roundedOfficial;
    evaluation.clarityScore = Math.round(avgDims.clarity * 10);
    evaluation.relevanceScore = Math.round(avgDims.relevance * 10);
    evaluation.structureScore = Math.round(avgDims.structure * 10);
    evaluation.ownershipScore = Math.round(avgDims.ownership * 10);
    evaluation.problemSolvingScore = Math.round(avgDims.technicalDepth * 10);
    evaluation.teamworkScore = Math.round(avgDims.professionalism * 10);
    evaluation.professionalismScore = Math.round(avgDims.professionalism * 10);

    // CRITICAL: Overwrite evaluation.aiSummary so it uses roundedOfficial and never carries over stale scores (e.g. 40/100)
    evaluation.aiSummary = `Candidate completed ${mainQuestions.length} behavioral interview question${mainQuestions.length > 1 ? 's' : ''}. Overall score: ${roundedOfficial}/100.`;

    const { criteriaEvidence, ...dbEval } = evaluation;

    // Aggregate session speech intelligence across all recorded responses
    const speechAnalyses = allQuestionsWithResponses
      .map((q: any) => q.response?.speechAnalysis)
      .filter((analysis: any) => analysis && typeof analysis === 'object' && (analysis.status === 'completed' || analysis.metadata?.status === 'completed'));
    const speechSummary = HRSpeechAnalyzer.aggregateSessionSpeech(speechAnalyses);

    // Phase 4: Generate Evidence-Based Executive Interview Summary exclusively for displayed main questions
    let interviewSummary: any = null;
    try {
      const summaryResponses = mainQuestions.map((q: any) => {
        const followUps = followUpQuestions.filter((fu: any) => fu.isFollowUpToId === q.id && fu.response);
        const combinedDuration = (q.response?.durationSeconds || 0) +
          followUps.reduce((acc: number, fu: any) => acc + (fu.response?.durationSeconds || 0), 0);
        const combinedWords = (q.response?.wordCount || 0) +
          followUps.reduce((acc: number, fu: any) => acc + (fu.response?.wordCount || 0), 0);

        return {
          questionId: q.id,
          sequence: q.sequence,
          question: q.question,
          category: q.category,
          difficulty: q.difficulty,
          competency: q.competency,
          rawTranscript: q.response?.rawTranscript,
          verifiedTranscript: q.response?.verifiedTranscript,
          questionScore: q.response?.questionScore,
          dimensionScores: q.response?.dimensionScores,
          starAnalysis: q.response?.starAnalysis,
          speechAnalysis: q.response?.speechAnalysis,
          durationSeconds: combinedDuration,
          wordCount: combinedWords,
        };
      });

      interviewSummary = await HRInterviewSummaryGenerator.generateSummary({
        candidate: {
          targetRole: hrSession.position || 'Software Engineer',
        },
        durationSeconds: summaryResponses.reduce((sum: number, r: any) => sum + (r.durationSeconds || 0), 0),
        officialHRScore: authoritativeOverallScore,
        officialScoreSource: 'HRScoreEngine',
        responses: summaryResponses,
        speechSummary,
      });
    } catch (summaryErr) {
      console.error('Failed to generate HR interview summary:', summaryErr);
      interviewSummary = {
        status: 'failed',
        metadata: {
          analysisVersion: 'hr-summary-v1',
          status: 'failed',
          generatedAt: new Date().toISOString(),
        },
      };
    }

    // Persist evaluation in DB
    await (prisma as any).hRInterviewEvaluation.upsert({
      where: { hrSessionId: hrSession.id },
      create: {
        hrSessionId: hrSession.id,
        ...dbEval,
        overallScore: authoritativeOverallScore,
        strengths: dbEval.strengths as any,
        improvements: dbEval.improvements as any,
        speechSummary: speechSummary as any,
        summary: interviewSummary as any,
      },
      update: {
        ...dbEval,
        overallScore: authoritativeOverallScore,
        strengths: dbEval.strengths as any,
        improvements: dbEval.improvements as any,
        speechSummary: speechSummary as any,
        summary: interviewSummary as any,
        evaluatedAt: new Date(),
      },
    });

    // Mark session as completed
    const completedAt = new Date();
    await (prisma as any).hRInterviewSession.update({
      where: { id: hrSession.id },
      data: {
        status: 'COMPLETED',
        completedAt,
        overallScore: authoritativeOverallScore,
      },
    });

    // Lock 1-hour media expiration timer from actual interview completion
    await InterviewMediaService.updateExpirationOnCompletion(interviewId, completedAt).catch((err) => {
      console.warn('[HRInterviewService] Failed to update media expiration on completion:', err);
    });

    // Build conversation for InterviewHistory (backward compatibility with ReportEvidenceService)
    const allMessages = await prisma.interviewHistory.findMany({
      where: { interviewId, event: 'HR_MESSAGE' },
      orderBy: { timestamp: 'asc' },
    });

    const conversation = allMessages.map((m, idx) => {
      const d = m.details as any;
      return { role: d.role || 'candidate', content: d.content || '', turnIndex: idx };
    });

    const telemetry = {
      completed: true,
      hrSessionId: hrSession.id,
      overallScore: evaluation.overallScore,
      totalInteractions: allMessages.length,
      candidateResponsesCount: allMessages.filter((m) => (m.details as any)?.role === 'candidate').length,
      conversation,
      evaluation,
      completedAt: new Date().toISOString(),
    };

    await prisma.interviewHistory.create({
      data: {
        interviewId,
        event: 'HR_COMPLETE',
        details: telemetry as any,
      },
    });

    return { success: true, stage: 'HR_COMPLETED', evaluation, telemetry };
  }

  // ─── 7. Get Conversation (Legacy Compatibility) ───────────────────────────────

  static async getConversation(interviewId: string, identityId: string) {
    await InterviewSessionService.getInterviewScoped(interviewId, identityId);

    const events = await prisma.interviewHistory.findMany({
      where: { interviewId, event: 'HR_MESSAGE' },
      orderBy: { timestamp: 'asc' },
    });

    const conversation: HRMessage[] = events
      .filter((ev) => (ev.details as any)?.content)
      .map((ev, idx) => {
        const d = ev.details as any;
        return {
          id: ev.id,
          role: d.role || 'candidate',
          content: d.content,
          timestamp: ev.timestamp.toISOString(),
          turnIndex: d.turnIndex ?? idx,
        };
      });

    if (conversation.length === 0) {
      try {
        const hrSession = await (prisma as any).hRInterviewSession.findUnique({
          where: { interviewId },
          include: { questions: { orderBy: { sequence: 'asc' }, take: 1 } },
        });
        if (hrSession?.questions?.[0]) {
          conversation.push({
            id: 'initial-prompt',
            role: 'interviewer',
            content: hrSession.questions[0].question,
            timestamp: new Date().toISOString(),
            turnIndex: 0,
          });
        }
      } catch { /* ignore */ }
    }

    const candidateCount = conversation.filter((m) => m.role === 'candidate').length;
    return {
      conversation,
      totalResponses: candidateCount,
      canComplete: candidateCount >= 1,
    };
  }

  // ─── 8. Get Detailed HR Report ────────────────────────────────────────────────

  static async getReport(interviewId: string, identityId: string) {
    await InterviewSessionService.getInterviewScoped(interviewId, identityId);

    const hrSession = await (prisma as any).hRInterviewSession.findUnique({
      where: { interviewId },
      include: {
        questions: {
          include: {
            response: {
              include: { answerMedia: true },
            },
          },
          orderBy: { sequence: 'asc' },
        },
        evaluation: true,
      },
    });

    if (!hrSession) {
      throw Object.assign(new Error('HR session not found.'), { statusCode: 404 });
    }

    const formatted = this.formatSession(hrSession);
    this.validateReportConsistency(formatted);
    return formatted;
  }

  // ─── 9. Process Turn (Legacy Backward Compatibility) ─────────────────────────
  // This is kept to ensure the existing POST /hr/message endpoint continues to work
  // while the new system is being adopted.

  static async processTurn(
    interviewId: string,
    identityId: string,
    candidateResponse: string,
    clientTurnIndex?: number
  ) {
    await InterviewSessionService.requireActiveSession(interviewId, identityId);

    if (!candidateResponse || !candidateResponse.trim()) {
      throw new Error('Response content cannot be empty.');
    }

    // Try to use new HR session system
    try {
      const hrSession = await (prisma as any).hRInterviewSession.findUnique({
        where: { interviewId },
        include: {
          questions: {
            include: { response: true },
            orderBy: { sequence: 'asc' },
          },
        },
      });

      if (hrSession) {
        const nextUnanswered = hrSession.questions.find(
          (q: any) => q.questionType === 'MAIN' && !q.response
        );
        if (nextUnanswered) {
          const result = await this.submitResponse(
            interviewId,
            identityId,
            nextUnanswered.id,
            candidateResponse,
            30
          );
          const followUpText =
            result.followUpQuestion?.question ||
            result.nextMainQuestion?.question ||
            'Thank you for your response. Your answers have been recorded.';

          return {
            success: true,
            nextMessage: { role: 'interviewer', content: followUpText },
            conversation: [],
            canComplete: result.canComplete,
            totalResponses: result.progress.answered,
          };
        }
      }
    } catch { /* fall through to legacy */ }

    // Legacy fallback
    const { hr } = await InterviewSessionService.getSessionQuestions(interviewId, identityId);
    const category = 'Project Challenge';
    const mainQ = hr[0]?.description || 'Please describe a technical challenge you overcame.';

    const followUpText = await InterviewAIService.generateFollowUp(
      mainQ, category, candidateResponse
    );

    const interviewerMsg: HRMessage = {
      id: `interv-${Date.now()}`,
      role: 'interviewer',
      content: followUpText,
      timestamp: new Date().toISOString(),
      turnIndex: (clientTurnIndex || 0) + 1,
    };

    await prisma.interviewHistory.create({
      data: {
        interviewId,
        event: 'HR_MESSAGE',
        details: { role: 'candidate', content: candidateResponse.trim() } as any,
      },
    });
    await prisma.interviewHistory.create({
      data: {
        interviewId,
        event: 'HR_MESSAGE',
        details: interviewerMsg as any,
      },
    });

    return {
      success: true,
      nextMessage: interviewerMsg,
      conversation: [],
      canComplete: true,
      totalResponses: 1,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private static async requireHRSession(interviewId: string): Promise<any> {
    const session = await (prisma as any).hRInterviewSession.findUnique({ where: { interviewId } });
    if (!session) {
      throw Object.assign(new Error('HR session not initialized. Call /hr/session first.'), { statusCode: 404 });
    }
    return session;
  }

  private static formatSession(hrSession: any) {
    return {
      id: hrSession.id,
      interviewId: hrSession.interviewId,
      position: hrSession.position,
      interviewType: hrSession.interviewType,
      status: hrSession.status,
      startedAt: hrSession.startedAt,
      completedAt: hrSession.completedAt,
      overallScore: hrSession.overallScore,
      questions: (hrSession.questions || []).map((q: any) => ({
        id: q.id,
        question: q.question,
        category: q.category,
        questionType: q.questionType,
        sequence: q.sequence,
        difficulty: q.difficulty || 'medium',
        competency: q.competency || null,
        selectionReason: q.selectionReason || null,
        isFollowUpToId: q.isFollowUpToId,
        response: q.response
          ? {
              id: q.response.id,
              questionId: q.response.questionId || q.id,
              transcript: q.response.transcript,
              rawTranscript: q.response.rawTranscript,
              verifiedTranscript: q.response.verifiedTranscript,
              corrections: q.response.corrections,
              uncertainSegments: q.response.uncertainSegments,
              dimensionScores: q.response.dimensionScores,
              questionScore: q.response.questionScore,
              justification: q.response.justification,
              strengths: q.response.strengths,
              areasForImprovement: q.response.areasForImprovement,
              starFormatDetected: q.response.starFormatDetected,
              starAnalysis: q.response.starAnalysis,
              speechAnalysis: q.response.speechAnalysis,
              responseQuality: q.response.responseQuality,
              evaluationStatus: q.response.evaluationStatus,
              durationSeconds: q.response.durationSeconds,
              wordCount: q.response.wordCount,
              hasRecording: !!q.response.recordingPath || !!q.response.answerMedia,
              recordingPath: q.response.recordingPath,
              answerMedia: q.response.answerMedia
                ? InterviewMediaService.formatMediaDTO(q.response.answerMedia, hrSession.interviewId)
                : {
                    available: false,
                    status: 'UNAVAILABLE',
                    reason: 'Answer recording unavailable.',
                  },
              submittedAt: q.response.submittedAt,
            }
          : null,
      })),
      evaluation: hrSession.evaluation
        ? {
            communicationScore: hrSession.evaluation.communicationScore,
            problemSolvingScore: hrSession.evaluation.problemSolvingScore,
            teamworkScore: hrSession.evaluation.teamworkScore,
            professionalismScore: hrSession.evaluation.professionalismScore,
            relevanceScore: hrSession.evaluation.relevanceScore,
            clarityScore: hrSession.evaluation.clarityScore,
            ownershipScore: hrSession.evaluation.ownershipScore,
            leadershipScore: hrSession.evaluation.leadershipScore,
            confidenceScore: hrSession.evaluation.confidenceScore,
            structureScore: hrSession.evaluation.structureScore,
            overallScore: hrSession.evaluation.overallScore,
            feedback: hrSession.evaluation.feedback,
            strengths: hrSession.evaluation.strengths,
            improvements: hrSession.evaluation.improvements,
            starGuidance: hrSession.evaluation.starGuidance,
            aiSummary: hrSession.evaluation.aiSummary,
            speechSummary: hrSession.evaluation.speechSummary,
            summary: hrSession.evaluation.summary,
          }
        : null,
    };
  }

  /**
   * Backend Validation for Report Consistency (Requirement 11).
   * Verifies Single Source of Truth for score, question-response mapping integrity,
   * STAR count bounds, and speech pace consistency before returning the DTO.
   */
  static validateReportConsistency(sessionDto: any): void {
    if (!sessionDto) return;

    const mainQuestions = (sessionDto.questions || []).filter((q: any) => q.questionType === 'MAIN');

    // 1. Question-Response Mapping Integrity
    for (const q of sessionDto.questions || []) {
      if (q.response) {
        if (q.response.questionId && q.response.questionId !== q.id) {
          throw new Error(`Data Inconsistency: Question ${q.id} has response mapped to questionId ${q.response.questionId}`);
        }
      }
    }

    if (sessionDto.evaluation) {
      const evalScore = Math.round(sessionDto.evaluation.overallScore);
      const sessionScore = sessionDto.overallScore !== null && sessionDto.overallScore !== undefined
        ? Math.round(sessionDto.overallScore)
        : null;

      // 2. Official Score Single Source of Truth
      if (sessionScore !== null && evalScore !== sessionScore) {
        console.warn(`[Consistency] Evaluation overallScore (${evalScore}) differs from session overallScore (${sessionScore}). Harmonizing to authoritative score.`);
        sessionDto.evaluation.overallScore = sessionScore;
      }

      // Check summary overallAssessment score matches
      if (sessionDto.evaluation.summary?.overallAssessment) {
        const summaryScore = Math.round(sessionDto.evaluation.summary.overallAssessment.officialScore);
        if (summaryScore !== evalScore) {
          console.warn(`[Consistency] Summary overallAssessment score (${summaryScore}) contradicts evaluation score (${evalScore}). Harmonizing.`);
          sessionDto.evaluation.summary.overallAssessment.officialScore = evalScore;
        }
      }

      // Check aiSummary doesn't display stale score (e.g. "40/100" vs 58)
      if (sessionDto.evaluation.aiSummary) {
        const match = sessionDto.evaluation.aiSummary.match(/\b(\d+)\s*\/\s*100\b/);
        if (match && parseInt(match[1], 10) !== evalScore) {
          console.warn(`[Consistency] aiSummary contains conflicting score ${match[1]}/100 vs official ${evalScore}/100. Harmonizing.`);
          sessionDto.evaluation.aiSummary = sessionDto.evaluation.aiSummary.replace(/\b\d+\s*\/\s*100\b/g, `${evalScore}/100`);
        }
      }

      // 3. STAR Count Consistency
      if (sessionDto.evaluation.summary?.starAssessment) {
        const star = sessionDto.evaluation.summary.starAssessment;
        if (star.completeResponses > star.applicableResponses) {
          console.warn(`[Consistency] STAR complete (${star.completeResponses}) exceeded applicable (${star.applicableResponses}). Clamping.`);
          star.completeResponses = star.applicableResponses;
        }
        if (star.applicableResponses > mainQuestions.length) {
          console.warn(`[Consistency] STAR applicable count (${star.applicableResponses}) exceeds main questions count (${mainQuestions.length}). Clamping.`);
          star.applicableResponses = mainQuestions.length;
          star.completeResponses = Math.min(star.completeResponses, star.applicableResponses);
          if (typeof star.summary === 'string') {
            star.summary = star.summary.replace(/\bof\s+\d+\s+behavioral\b/g, `of ${star.applicableResponses} behavioral`);
          }
        }
      }

      // 4. Speech Summary WPM & Question Count Consistency in Summary
      if (sessionDto.evaluation.summary?.executiveSummary) {
        let exec = sessionDto.evaluation.summary.executiveSummary;

        // Ensure question count matches displayed main questions
        exec = exec.replace(/\bcompleted\s+\d+\s+of\s+\d+\s+(?:scheduled|behavioral)\s+questions\b/gi, `completed ${mainQuestions.length} behavioral questions`);
        exec = exec.replace(/\b\d+\s+of\s+\d+\s+scheduled\s+questions\b/gi, `${mainQuestions.length} behavioral questions`);
        exec = exec.replace(/\b(\d+)\s+of\s+\d+\s+applicable\s+scenario\s+questions\b/gi, `$1 of ${mainQuestions.length} applicable scenario questions`);

        // Ensure score matches authoritative score
        exec = exec.replace(/\b\d+\s*\/\s*100\b/g, `${evalScore}/100`);

        if (sessionDto.evaluation.speechSummary) {
          const expectedWpm = sessionDto.evaluation.speechSummary.averageWpm !== null
            ? Math.round(sessionDto.evaluation.speechSummary.averageWpm)
            : null;
          if (expectedWpm !== null) {
            exec = exec.replace(/\b(\d+)\s*WPM\b/gi, (m: string, p1: string) => {
              const parsed = parseInt(p1, 10);
              if (parsed !== expectedWpm) {
                console.warn(`[Consistency] Executive summary has discordant WPM ${parsed} vs expected ${expectedWpm}. Harmonizing.`);
                return `${expectedWpm} WPM`;
              }
              return m;
            });
          }
        }

        sessionDto.evaluation.summary.executiveSummary = exec;
      }
    }
  }
}
