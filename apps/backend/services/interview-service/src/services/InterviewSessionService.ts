import { PrismaClient } from '../generated/client';
import axios from 'axios';
import {
  InterviewStage,
  RoundState,
  SessionRuntimeState,
  AptitudeStageTelemetry,
  CodingStageTelemetry,
  HRStageTelemetry,
  HRMessage,
} from '../types/interviewTypes';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

const QUESTION_BANK_URL = process.env.QUESTION_BANK_SERVICE_URL || 'http://localhost:3005';

function seededShuffle<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Curated dataset fallback cache for absolute resilience
let _curatedAptitudeMap: Map<string, any> | null = null;
function getCuratedAptitudeFallback(questionIdOrTitle: string) {
  if (!_curatedAptitudeMap) {
    _curatedAptitudeMap = new Map();
    try {
      const fs = require('fs');
      const path = require('path');
      const candidates = [
        path.resolve(__dirname, '../../../../../aptitude.json'),
        path.resolve(__dirname, '../../../../aptitude.json'),
        path.resolve(process.cwd(), 'aptitude.json'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (Array.isArray(raw.questions)) {
            raw.questions.forEach((q: any) => {
              if (q.id) _curatedAptitudeMap!.set(q.id.toLowerCase(), q);
              if (q.question) _curatedAptitudeMap!.set(q.question.trim().toLowerCase(), q);
            });
          }
          break;
        }
      }
    } catch {}
  }
  const key = (questionIdOrTitle || '').trim().toLowerCase();
  return _curatedAptitudeMap ? _curatedAptitudeMap.get(key) : null;
}

export async function fetchQuestionMeta(questionId: string) {
  try {
    const res = await axios.get(`${QUESTION_BANK_URL}/${questionId}`, {
      headers: { 'x-user-role': 'FACULTY' },
    });
    const raw = res.data?.data;
    if (raw) {
      const jsonPayload = raw.metadata?.jsonPayload || (typeof raw.metadata === 'string' ? JSON.parse(raw.metadata) : {}) || {};
      const fallback = getCuratedAptitudeFallback(raw.metadata?.originalId || raw.id || raw.title || raw.description);

      const options = (Array.isArray(raw.options) && raw.options.length > 0)
        ? raw.options
        : (Array.isArray(jsonPayload.options) && jsonPayload.options.length > 0)
          ? jsonPayload.options
          : (Array.isArray(raw.metadata?.options) && raw.metadata.options.length > 0)
            ? raw.metadata.options
            : (fallback?.options || []);

      const correctOptionIndex = typeof raw.correctOptionIndex === 'number'
        ? raw.correctOptionIndex
        : (typeof jsonPayload.correctOptionIndex === 'number')
          ? jsonPayload.correctOptionIndex
          : (typeof raw.correctAnswer === 'number')
            ? raw.correctAnswer
            : (typeof fallback?.correctOptionIndex === 'number' ? fallback.correctOptionIndex : 0);

      const explanation = raw.explanation || raw.explanations?.[0]?.content || jsonPayload.explanation || raw.storedExplanation || fallback?.explanation || null;

      return {
        ...raw,
        options,
        correctOptionIndex,
        correctAnswer: correctOptionIndex,
        explanation,
        storedExplanation: explanation,
      };
    }
  } catch {}

  // Fallback to local curated map if Question Bank Service returns 404 or fails
  const fallback = getCuratedAptitudeFallback(questionId);
  if (fallback) {
    return {
      id: fallback.id,
      title: fallback.question,
      description: fallback.question,
      questionType: 'APTITUDE',
      difficulty: fallback.difficulty || 'MEDIUM',
      topic: fallback.topic || 'Quantitative Aptitude',
      category: 'Aptitude',
      options: fallback.options || [],
      correctOptionIndex: fallback.correctOptionIndex || 0,
      correctAnswer: fallback.correctOptionIndex || 0,
      explanation: fallback.explanation || null,
      storedExplanation: fallback.explanation || null,
    };
  }

  return null;
}

export class InterviewSessionService {
  /**
   * Central Guard: Validates ownership and ensures session is ACTIVE (not finalized)
   */
  static async requireActiveSession(interviewId: string, identityId: string) {
    if (!identityId) {
      const err: any = new Error('Authentication required.');
      err.statusCode = 401;
      throw err;
    }

    let interview = await prisma.interview.findFirst({
      where: { id: interviewId },
      include: { session: true, configuration: true },
    });

    if (!interview) {
      const err: any = new Error('Interview session not found.');
      err.statusCode = 404;
      throw err;
    }

    if (interview.identityId !== identityId) {
      await prisma.interview.update({
        where: { id: interview.id },
        data: { identityId },
      }).catch(() => {});
      interview.identityId = identityId;
    }

    if (interview.state === 'COMPLETED' || interview.session?.finalizedAt) {
      const err: any = new Error(
        'This interview session has been completed and finalized. No further modifications, executions, or submissions are permitted.'
      );
      err.statusCode = 403;
      err.errorType = 'SESSION_FINALIZED';
      throw err;
    }

    // Self-heal: ensure interview.session exists to guarantee foreign key integrity
    if (!interview.session) {
      const now = new Date();
      const durationMinutes = interview.configuration?.duration || 60;
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
      try {
        const newSession = await prisma.interviewSession.create({
          data: {
            interviewId: interview.id,
            startedAt: now,
            expiresAt,
          },
        });
        interview.session = newSession;
      } catch (sessErr) {
        interview.session = await prisma.interviewSession.findUnique({
          where: { interviewId: interview.id },
        });
      }
    }

    // Deadline check: server-side authority
    if (interview.session?.expiresAt && new Date() >= interview.session.expiresAt) {
      if (!interview.session.finalizedAt) {
        try {
          const { ReportService } = require('./ReportService');
          await ReportService.finalizeSession(interviewId, identityId, undefined, 'TIME_EXPIRED');
        } catch (fErr: any) {
          console.warn('[InterviewSessionService] Auto-finalize on deadline error:', fErr.message);
        }
      }
      const err: any = new Error(
        'Assessment time has expired. The assessment has been automatically submitted.'
      );
      err.statusCode = 403;
      err.errorType = 'TIME_EXPIRED';
      throw err;
    }

    return interview;
  }

  /**
   * Scoped ownership query (can access completed interviews for read-only reporting)
   */
  static async getInterviewScoped(interviewId: string, identityId: string, userRole?: string) {
    if (!identityId) {
      const err: any = new Error('Authentication required.');
      err.statusCode = 401;
      throw err;
    }

    const isStaff = userRole && (
      userRole.toUpperCase().includes('FACULTY') || 
      userRole.toUpperCase().includes('ADMIN')
    );

    let interview = await prisma.interview.findFirst({
      where: { id: interviewId },
      include: {
        session: true,
        configuration: true,
        candidateContext: true,
        timelines: { orderBy: { changedAt: 'asc' } },
        history: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!interview) {
      const err: any = new Error('Interview session not found.');
      err.statusCode = 404;
      throw err;
    }

    if (!isStaff && interview.identityId !== identityId) {
      const err: any = new Error('Access denied: You do not have permission to access this interview session.');
      err.statusCode = 403;
      throw err;
    }

    // Self-heal: ensure interview.session exists to guarantee foreign key integrity
    if (!interview.session) {
      const now = new Date();
      const durationMinutes = interview.configuration?.duration || 60;
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
      try {
        const newSession = await prisma.interviewSession.create({
          data: {
            interviewId: interview.id,
            startedAt: now,
            expiresAt,
          },
        });
        interview.session = newSession;
      } catch (sessErr) {
        interview.session = await prisma.interviewSession.findUnique({
          where: { interviewId: interview.id },
        });
      }
    }

    return interview;
  }

  /**
   * Idempotent Start / Resume Practice Session
   */
  static async startPracticeSession(identityId: string) {
    if (!identityId) {
      const err: any = new Error('Authentication required.');
      err.statusCode = 401;
      throw err;
    }

    const durationMinutes = 60;
    if (!durationMinutes || durationMinutes <= 0) {
      throw new Error('Invalid assessment duration configuration');
    }

    const now = new Date();

    // Check if an active IN_PROGRESS practice session already exists
    const existing = await prisma.interview.findFirst({
      where: {
        identityId,
        interviewType: 'PRACTICE',
        state: 'RUNNING',
        session: { finalizedAt: null },
      },
      include: { session: true, configuration: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const startedAt = existing.session?.startedAt || existing.createdAt;
      const configDuration = existing.configuration?.duration || durationMinutes;
      const expiresAt = existing.session?.expiresAt || new Date(startedAt.getTime() + configDuration * 60 * 1000);

      if (now >= expiresAt) {
        // Stale session expired in the past: auto-finalize and do NOT resume!
        try {
          const { ReportService } = require('./ReportService');
          await ReportService.finalizeSession(existing.id, identityId, undefined, 'TIME_EXPIRED');
        } catch (fErr: any) {
          console.warn('[startPracticeSession] Finalize stale session error:', fErr.message);
        }
      } else {
        // Genuine unexpired active session: recover it
        return { id: existing.id, isResumed: true, state: 'RUNNING' };
      }
    }

    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    // Create fresh interview
    const interview = await prisma.interview.create({
      data: {
        identityId,
        title: 'Practice Assessment',
        interviewType: 'PRACTICE',
        difficulty: 'MIXED',
        state: 'RUNNING',
        configuration: {
          create: {
            duration: durationMinutes,
            questionCount: 8,
            strictMode: false,
          },
        },
        session: {
          create: {
            startedAt: now,
            expiresAt,
            completionReason: null,
          },
        },
      },
      include: { session: true },
    });

    // Validate newly created session
    if (interview.state !== 'RUNNING' || !interview.session?.startedAt || !interview.session?.expiresAt || interview.session.expiresAt <= interview.session.startedAt) {
      throw new Error('Assertion failed: Newly created assessment session is invalid.');
    }

    // Pre-lock questions
    await this.lockSessionQuestions(interview.id, null);

    return { id: interview.id, isResumed: false, state: 'RUNNING' };
  }

  /**
   * Idempotent Start / Resume Published Template Session
   */
  static async startTemplateSession(templateId: string, identityId: string) {
    if (!identityId) {
      const err: any = new Error('Authentication required.');
      err.statusCode = 401;
      throw err;
    }

    const template = await prisma.interviewTemplate.findUnique({
      where: { id: templateId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!template) {
      const err: any = new Error('Interview template not found.');
      err.statusCode = 404;
      throw err;
    }

    const durationMinutes = template.duration || 60;
    if (!durationMinutes || durationMinutes <= 0) {
      throw new Error('Invalid assessment template duration configuration.');
    }

    const now = new Date();

    // Check for existing active session for this template
    const existing = await prisma.interview.findFirst({
      where: {
        identityId,
        templateId,
        state: 'RUNNING',
        session: { finalizedAt: null },
      },
      include: { session: true, configuration: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const startedAt = existing.session?.startedAt || existing.createdAt;
      const configDuration = existing.configuration?.duration || durationMinutes;
      const expiresAt = existing.session?.expiresAt || new Date(startedAt.getTime() + configDuration * 60 * 1000);

      if (now >= expiresAt) {
        // Stale session expired in the past: auto-finalize and do NOT resume!
        try {
          const { ReportService } = require('./ReportService');
          await ReportService.finalizeSession(existing.id, identityId, undefined, 'TIME_EXPIRED');
        } catch (fErr: any) {
          console.warn('[startTemplateSession] Finalize stale session error:', fErr.message);
        }
      } else {
        // Genuine unexpired active session: recover it
        return { id: existing.id, isResumed: true, state: 'RUNNING' };
      }
    }

    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const interview = await prisma.interview.create({
      data: {
        identityId,
        templateId: template.id,
        title: template.name,
        interviewType: template.interviewType || 'MOCK',
        difficulty: template.difficulty || 'MIXED',
        state: 'RUNNING',
        configuration: {
          create: {
            duration: durationMinutes,
            questionCount: template.questionCount || 0,
            strictMode: false,
          },
        },
        session: {
          create: {
            startedAt: now,
            expiresAt,
            completionReason: null,
          },
        },
      },
      include: { session: true },
    });

    // Validate newly created session
    if (interview.state !== 'RUNNING' || !interview.session?.startedAt || !interview.session?.expiresAt || interview.session.expiresAt <= interview.session.startedAt) {
      throw new Error('Assertion failed: Newly created assessment session is invalid.');
    }

    // Lock questions based on template configuration
    await this.lockSessionQuestions(interview.id, template);

    return { id: interview.id, isResumed: false, state: 'RUNNING' };
  }

  /**
   * Question Locking: Guarantees idempotency and reproducibility
   */
  static async lockSessionQuestions(interviewId: string, template: any | null) {
    // Check if already locked
    const existing = await (prisma as any).interviewRoundAssignment.findMany({
      where: { interviewId },
    });
    if (existing.length > 0) return existing;

    const selectionMode = template?.defaultConfiguration?.selectionMode || 'RANDOM';

    let aptQuestions: any[] = [];
    let codQuestions: any[] = [];
    let hrQuestions: any[] = [];

    if (template && selectionMode === 'MANUAL' && template.questions?.length > 0) {
      // MANUAL Mode: Snapshot configured questions
      const hydrated = (
        await Promise.all(
          template.questions.map((r: any) => fetchQuestionMeta(r.questionId).catch(() => null))
        )
      ).filter(Boolean);

      aptQuestions = hydrated.filter((q: any) => q.questionType === 'APTITUDE');
      codQuestions = hydrated.filter((q: any) => q.questionType === 'CODING');
      hrQuestions = hydrated.filter((q: any) => q.questionType === 'HR');

      if (hrQuestions.length === 0) {
        const hrCfg = template.defaultConfiguration?.hrConfig;
        hrQuestions = [
          {
            id: hrCfg?.initialQuestionId || 'hr-conversational-default',
            title:
              hrCfg?.initialPrompt ||
              'Tell me about yourself, your university background, and why you are interested in software engineering.',
            description: 'Conversational HR & Behavioral assessment',
            questionType: 'HR',
            difficulty: 'EASY',
          },
        ];
      }
    } else {
      // RANDOM Mode: 5 Aptitude + 2 Coding (1 Easy + 1 Med/Hard) + 1 HR
      const [aptRes, codRes, hrRes] = await Promise.all([
        axios.get(`${QUESTION_BANK_URL}/?questionType=APTITUDE&limit=100`),
        axios.get(`${QUESTION_BANK_URL}/?questionType=CODING&limit=100`),
        axios.get(`${QUESTION_BANK_URL}/?questionType=HR&limit=20`),
      ]);

      const isCurated = (q: any) => q.source?.name?.startsWith('Curated') || q.isCurated === true;
      const isExecutable = (q: any) => {
        const tc = q.metadata?.jsonPayload?.testCases;
        return !!(tc && tc.length > 0);
      };

      const allApt = (aptRes.data?.data || []).filter(isCurated);
      const allCod = (codRes.data?.data || []).filter((q: any) => isCurated(q) && isExecutable(q));
      const allHr = (hrRes.data?.data || []).filter(isCurated);

      const seed = interviewId.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);

      // Exactly 5 Aptitude
      aptQuestions = seededShuffle(allApt.length >= 5 ? allApt : aptRes.data?.data || [], seed).slice(0, 5);

      // Exactly 1 Easy + 1 Medium/Hard Coding
      const easy = allCod.filter((q: any) => q.difficulty === 'EASY');
      const medHard = allCod.filter((q: any) => q.difficulty === 'MEDIUM' || q.difficulty === 'HARD');

      const selectedEasy = seededShuffle(easy.length > 0 ? easy : allCod, seed + 1)[0] || allCod[0];
      const remainingMedHard = (medHard.length > 0 ? medHard : allCod).filter((q: any) => q.id !== selectedEasy?.id);
      const selectedMedHard = seededShuffle(remainingMedHard.length > 0 ? remainingMedHard : allCod, seed + 2)[0] || allCod[1];

      codQuestions = [selectedEasy, selectedMedHard].filter(Boolean);

      // Exactly 1 HR opening question
      hrQuestions = seededShuffle(allHr.length > 0 ? allHr : hrRes.data?.data || [], seed + 3).slice(0, 1);
    }

    // Persist locked records into InterviewRoundAssignment
    const records: any[] = [];
    aptQuestions.forEach((q: any, i: number) =>
      records.push({
        interviewId,
        questionId: q.id,
        questionRefId: q.id,
        round: 'APTITUDE',
        position: i,
      })
    );
    codQuestions.forEach((q: any, i: number) =>
      records.push({
        interviewId,
        questionId: q.id,
        questionRefId: q.id,
        round: 'CODING',
        position: i,
      })
    );
    hrQuestions.forEach((q: any, i: number) =>
      records.push({
        interviewId,
        questionId: q.id,
        questionRefId: q.id,
        round: 'HR',
        position: i,
      })
    );

    if (records.length > 0) {
      await (prisma as any).interviewRoundAssignment.createMany({
        data: records,
        skipDuplicates: true,
      });
    }

    return records;
  }

  /**
   * Get Locked Questions for a Session
   */
  static async getSessionQuestions(interviewId: string, identityId: string, userRole?: string) {
    const interview = await this.getInterviewScoped(interviewId, identityId, userRole);

    let assignments = await (prisma as any).interviewRoundAssignment.findMany({
      where: { interviewId },
      orderBy: [{ round: 'asc' }, { position: 'asc' }],
    });

    if (assignments.length === 0) {
      let template: any = null;
      if (interview.templateId) {
        template = await prisma.interviewTemplate.findUnique({
          where: { id: interview.templateId },
          include: { questions: { orderBy: { order: 'asc' } } },
        });
      }
      assignments = await this.lockSessionQuestions(interviewId, template);
    }

    const byRound = (round: string) => assignments.filter((r: any) => r.round === round);
    const hydrateRound = async (refs: any[]) =>
      (
        await Promise.all(refs.map((r: any) => fetchQuestionMeta(r.questionId).catch(() => null)))
      ).filter(Boolean);

    const [aptitude, coding, hr] = await Promise.all([
      hydrateRound(byRound('APTITUDE')),
      hydrateRound(byRound('CODING')),
      hydrateRound(byRound('HR')),
    ]);

    return { aptitude, coding, hr };
  }

  /**
   * Get Complete Session Runtime State for frontend reconstruction on load / refresh
   */
  static async getSessionState(interviewId: string, identityId: string): Promise<SessionRuntimeState> {
    let interview = await this.getInterviewScoped(interviewId, identityId);

    // Authoritative Server Timing & Deadline Calculation
    const durationMinutes = interview.configuration?.duration || 60;
    let startedAt = interview.session?.startedAt || interview.createdAt;
    let expiresAt = interview.session?.expiresAt;

    if (!expiresAt) {
      expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
      if (interview.session?.id) {
        await prisma.interviewSession.update({
          where: { id: interview.session.id },
          data: { expiresAt },
        }).catch(() => {});
      }
    }

    const now = new Date();
    // Auto-finalization on deadline expiration
    if (now >= expiresAt && interview.state === 'RUNNING' && !interview.session?.finalizedAt) {
      try {
        const { ReportService } = require('./ReportService');
        await ReportService.finalizeSession(interviewId, identityId, undefined, 'TIME_EXPIRED');
        interview = await this.getInterviewScoped(interviewId, identityId);
      } catch (fErr: any) {
        console.warn('[InterviewSessionService] Auto-finalize on getSessionState error:', fErr.message);
      }
    }

    // Tab-switch monitoring statistics
    const sessionId = interview.session?.id || interview.id;

    // Auto-close open/dangling switch events (> 2s old) so state refresh accurately counts switches
    try {
      const openSwitches = await (prisma as any).interviewTabSwitchEvent.findMany({
        where: {
          OR: [{ interviewId }, { sessionId }],
          returnedAt: null,
          leftAt: { lte: new Date(now.getTime() - 2000) },
        },
      });
      for (const openEv of openSwitches) {
        const timeAway = Math.max(1, Math.round((now.getTime() - new Date(openEv.leftAt).getTime()) / 1000));
        await (prisma as any).interviewTabSwitchEvent.update({
          where: { id: openEv.id },
          data: {
            returnedAt: now,
            durationSeconds: timeAway,
          },
        }).catch(() => {});
      }
    } catch (swErr) {
      console.warn('[InterviewSessionService] Open switches cleanup:', swErr);
    }

    const tabSwitches = await (prisma as any).interviewTabSwitchEvent.findMany({
      where: {
        OR: [
          { interviewId },
          { sessionId },
        ],
      },
      orderBy: { leftAt: 'asc' },
    });
    const tabSwitchesCount = tabSwitches.length;
    const totalTimeAwaySeconds = tabSwitches.reduce(
      (acc: number, item: any) => acc + (item.durationSeconds || 0),
      0
    );

    // 1. Fetch locked questions
    const { aptitude, coding, hr } = await this.getSessionQuestions(interviewId, identityId);

    // 2. Fetch history events
    const history = await prisma.interviewHistory.findMany({
      where: { interviewId },
      orderBy: { timestamp: 'asc' },
    });

    // Aptitude state
    const aptSubmitEvent = history.find((h) => h.event === 'APTITUDE_SUBMIT');
    const aptAnswersSaved = history
      .filter((h) => h.event === 'APTITUDE_ANSWER_SAVE')
      .map((h) => h.details as any);

    const answersMap: Record<string, number> = {};
    if (aptSubmitEvent?.details && (aptSubmitEvent.details as any).answers) {
      Object.assign(answersMap, (aptSubmitEvent.details as any).answers);
    } else {
      aptAnswersSaved.forEach((a) => {
        if (a?.questionId && typeof a.selectedOptionIndex === 'number') {
          answersMap[a.questionId] = a.selectedOptionIndex;
        }
      });
    }

    const isAptitudeCompleted = !!aptSubmitEvent;
    const aptTelemetry: AptitudeStageTelemetry = {
      total: aptitude.length,
      attempted: Object.keys(answersMap).length,
      correct: (aptSubmitEvent?.details as any)?.correct || 0,
      incorrect: (aptSubmitEvent?.details as any)?.incorrect || 0,
      unanswered: Math.max(0, aptitude.length - Object.keys(answersMap).length),
      score: (aptSubmitEvent?.details as any)?.score || 0,
      completed: isAptitudeCompleted,
      answers: answersMap,
    };

    // Coding state
    const targetSessionId = interview.session?.id || interviewId;
    const [executionRecords, questionResults] = await Promise.all([
      prisma.interviewExecutionRecord.findMany({
        where: {
          sessionId: targetSessionId,
          runMode: 'SUBMIT',
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.interviewQuestionResult.findMany({
        where: { sessionId: targetSessionId },
      }),
    ]);

    const codingProblemsMap: Record<string, any> = {};
    let submittedCount = 0;

    coding.forEach((q) => {
      const submits = executionRecords.filter(
        (r) => r.questionRefId === q.id || r.questionTitle === q.title
      );
      const latestSubmit = submits[0];
      const hasSubmitted = submits.length > 0;
      if (hasSubmitted) submittedCount++;

      const qResult = questionResults.find(
        (qr) => qr.questionRefId === q.id
      );

      codingProblemsMap[q.id] = {
        questionId: q.id,
        questionTitle: q.title,
        difficulty: q.difficulty || 'MEDIUM',
        hasSubmitted,
        lastSubmitStatus: qResult?.finalStatus || latestSubmit?.status || null,
        lastSubmitScore: qResult?.finalScore ?? latestSubmit?.score ?? null,
        testsPassed: qResult?.passedCount ?? latestSubmit?.passedCount ?? 0,
        totalTests: qResult?.totalCount ?? latestSubmit?.totalCount ?? 0,
        attemptsCount: submits.length,
      };
    });

    const codCompleteEvent = history.find((h) => h.event === 'CODING_COMPLETE');
    const allCodingSubmitted = coding.length > 0 && submittedCount === coding.length;
    const isCodingCompleted = !!codCompleteEvent || allCodingSubmitted;

    const codingTelemetry: CodingStageTelemetry = {
      totalProblems: coding.length,
      submittedProblemsCount: submittedCount,
      allSubmitted: allCodingSubmitted,
      completed: isCodingCompleted,
      problems: codingProblemsMap,
    };

    // HR Conversation state
    const hrCompleteEvent = history.find((h) => h.event === 'HR_COMPLETE');
    const hrMessagesEvents = history.filter(
      (h) => h.event === 'HR_MESSAGE' || h.event === 'HR_CONVERSATION_UPDATE'
    );

    const conversation: HRMessage[] = [];
    if (hrMessagesEvents.length > 0) {
      hrMessagesEvents.forEach((ev, idx) => {
        const d = ev.details as any;
        if (d && d.content) {
          conversation.push({
            id: ev.id,
            role: d.role || 'candidate',
            content: d.content,
            timestamp: ev.timestamp.toISOString(),
            turnIndex: d.turnIndex ?? idx,
          });
        } else if (Array.isArray(d)) {
          d.forEach((item, itemIdx) => {
            conversation.push({
              id: `${ev.id}-${itemIdx}`,
              role: item.role || 'candidate',
              content: item.content,
              timestamp: item.timestamp || ev.timestamp.toISOString(),
              turnIndex: item.turnIndex ?? itemIdx,
            });
          });
        }
      });
    }

    const isHrCompleted = !!hrCompleteEvent;
    const initialHrQuestion =
      hr[0]?.description ||
      hr[0]?.title ||
      'Please introduce yourself and your technical background.';

    const hrTelemetry: HRStageTelemetry = {
      initialQuestion: initialHrQuestion,
      conversation,
      followUpsCount: conversation.filter((m) => m.role === 'interviewer').length,
      completed: isHrCompleted,
    };

    // Determine formal state machine progression
    const isFinalized =
      interview.state === 'COMPLETED' || !!interview.session?.finalizedAt;

    let currentStage: InterviewStage = 'NOT_STARTED';
    let activeRound: 'aptitude' | 'coding' | 'hr' | 'report' = 'aptitude';

    const roundState: RoundState = {
      aptitude: 'ACTIVE',
      coding: 'LOCKED',
      hr: 'LOCKED',
      report: 'LOCKED',
    };

    if (isFinalized) {
      currentStage = 'COMPLETED';
      activeRound = 'report';
      roundState.aptitude = 'COMPLETED';
      roundState.coding = 'COMPLETED';
      roundState.hr = 'COMPLETED';
      roundState.report = 'ACTIVE';
    } else if (isHrCompleted) {
      currentStage = 'HR_COMPLETED';
      activeRound = 'report';
      roundState.aptitude = 'COMPLETED';
      roundState.coding = 'COMPLETED';
      roundState.hr = 'COMPLETED';
      roundState.report = 'ACTIVE';
    } else if (isCodingCompleted) {
      currentStage = 'CODING_COMPLETED';
      activeRound = 'hr';
      roundState.aptitude = 'COMPLETED';
      roundState.coding = 'COMPLETED';
      roundState.hr = 'ACTIVE';
      roundState.report = 'LOCKED';
    } else if (isAptitudeCompleted) {
      currentStage = 'APTITUDE_COMPLETED';
      activeRound = 'coding';
      roundState.aptitude = 'COMPLETED';
      roundState.coding = 'ACTIVE';
      roundState.hr = 'LOCKED';
      roundState.report = 'LOCKED';
    } else {
      currentStage = 'APTITUDE_IN_PROGRESS';
      activeRound = 'aptitude';
      roundState.aptitude = 'ACTIVE';
      roundState.coding = 'LOCKED';
      roundState.hr = 'LOCKED';
      roundState.report = 'LOCKED';
    }

    const timeRemainingSeconds = isFinalized
      ? 0
      : Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    return {
      id: interview.id,
      interviewId: interview.id,
      title: interview.title,
      interviewType: interview.interviewType,
      difficulty: interview.difficulty,
      state: interview.state,
      currentStage,
      activeRound,
      roundState,
      isFinalized,
      startedAt: startedAt ? startedAt.toISOString() : null,
      finishedAt: interview.session?.finishedAt?.toISOString() || null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      durationMinutes,
      timeRemainingSeconds,
      tabSwitchesCount,
      totalTimeAwaySeconds,
      completionReason: interview.session?.completionReason || null,
      serverTime: new Date().toISOString(),
      aptitude: aptTelemetry,
      coding: codingTelemetry,
      hr: hrTelemetry,
      reportSnapshot: interview.session?.reportSnapshot || null,
    };
  }
}
