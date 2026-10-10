import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from './generated/client';
import axios from 'axios';
import { recordExecution } from './ExecutionTracker';
import { generateReport } from './ReportEngine';

const app = express();
let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// ─── Language Map ─────────────────────────────────────────────────────────────

const JUDGE0_LANG_KEY: Record<number, string> = {
  71: 'python', 93: 'javascript', 63: 'javascript', 62: 'java', 54: 'cpp', 50: 'c',
};

// ─── Deterministic Shuffle ────────────────────────────────────────────────────

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

// ─── Question Resolution ──────────────────────────────────────────────────────

/** Resolve a questionRefId → actual questionId via InterviewRoundAssignment */
async function resolveQuestionId(interviewId: string, questionRefId: string): Promise<string | null> {
  try {
    const ref = await (prisma as any).interviewRoundAssignment.findFirst({
      where: { interviewId, questionRefId },
    });
    return ref?.questionId || null;
  } catch {
    return null;
  }
}

/** Fetch a question from Question Bank Service */
async function fetchQuestion(questionId: string) {
  const res = await axios.get(`http://localhost:3005/${questionId}`, {
    headers: { 'x-user-role': 'FACULTY' },
  });
  return res.data?.data || null;
}

// ─── Execution Payload Builder ────────────────────────────────────────────────

async function buildExecutionPayload(body: any, interviewId: string | null, runMode: 'RUN' | 'SUBMIT' | 'SAMPLE' | 'CUSTOM') {
  const isCustom =
    runMode === 'CUSTOM' ||
    (runMode as any) === 'CUSTOM_RUN' ||
    (runMode === 'RUN' && body.customInput !== undefined && body.customInput !== null && String(body.customInput).trim() !== '');

  const payload: any = {
    ...body,
    runMode: isCustom ? 'CUSTOM' : runMode,
  };

  if (isCustom) {
    payload.customInput = String(body.customInput || '');
    payload.stdin = String(body.customInput || '');
    delete payload.testCases;
  }

  let questionMeta: any = null;
  if (interviewId) {
    payload.interviewId = interviewId;
    payload.executionMode = 'INTERVIEW';
  }

  // Resolve questionRefId → questionId via reference table
  let questionId = body.questionRefId || body.questionId;
  if (interviewId && body.questionRefId) {
    const resolved = await resolveQuestionId(interviewId, body.questionRefId);
    if (resolved) {
      questionId = resolved;
      payload.questionId = resolved;
      console.log(`[Exec] Resolved questionRefId=${body.questionRefId} → questionId=${resolved}`);
    }
  }

  // Fetch authoritative metadata from Question Bank Service (only if not custom run)
  if (questionId && !isCustom) {
    try {
      const question = await fetchQuestion(questionId);
      const rawTCs =
        question?.metadata?.jsonPayload?.testCases ||
        question?.testCases ||
        question?.metadata?.testCases;
      if (rawTCs && Array.isArray(rawTCs) && rawTCs.length > 0) {
        const visibleTestCases = rawTCs;
        if (runMode === 'RUN' || runMode === 'SAMPLE') {
          payload.testCases = visibleTestCases.slice(0, 2);
        } else {
          payload.testCases = visibleTestCases;
        }
        console.log(`[Exec] ${runMode} | ${payload.testCases.length}/${visibleTestCases.length} testCases | question: ${question.title}`);
      }
      payload.executionType = 'STDIN_PROGRAM';
      if (question?.metadata?.jsonPayload?.execution) {
        payload.execution = question.metadata.jsonPayload.execution;
      }
      if (question?.examples) payload.examples = question.examples;
      questionMeta = question;
    } catch (err: any) {
      console.warn('[Exec] Failed to fetch question:', err.message);
    }
  }
  return { payload, questionMeta };
}

/** Forward execution payload to judge-service */
async function proxyToJudge(payload: any, identityHeader: string) {
  const res = await axios.post('http://localhost:3006/execute', payload, {
    headers: { 'x-identity-id': identityHeader || 'anonymous' },
    timeout: 120000,
  });
  // Judge service now returns flat result (no {success,data} envelope)
  return res.data;
}

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', service: 'interview-service', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: 'Database disconnected' });
  }
});

import { interviewSessionRouter } from './routes/interviewSessionRoutes';

// Mount modular student interview session runtime routes
app.use('/', interviewSessionRouter);
app.use('/interviews', interviewSessionRouter);

app.get('/', async (req, res) => {
  try {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const interviews = await prisma.interview.findMany({
      where: { identityId },
      orderBy: { createdAt: 'desc' },
      include: {
        session: true,
        history: true,
      },
    });

    const interviewIds = interviews.map((i) => i.id);
    const hrSessions = await (prisma as any).hRInterviewSession.findMany({
      where: { interviewId: { in: interviewIds } },
      include: {
        evaluation: true,
        questions: {
          include: { response: true },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    const hrSessionMap = new Map<string, any>();
    hrSessions.forEach((hs: any) => hrSessionMap.set(hs.interviewId, hs));

    const enriched = interviews.map((inv) => {
      const hrSession = hrSessionMap.get(inv.id);
      const session = inv.session;
      let snap = session?.reportSnapshot ? JSON.parse(JSON.stringify(session.reportSnapshot)) : null;

      // Extract authoritative HR score from HR session / evaluation / stored responses
      let hrScore: number | null = null;
      let hrStatus = hrSession?.status || 'NOT_STARTED';

      if (hrSession) {
        if (typeof hrSession.overallScore === 'number' && !isNaN(hrSession.overallScore)) {
          hrScore = Math.round(hrSession.overallScore);
        } else if (typeof hrSession.evaluation?.overallScore === 'number' && !isNaN(hrSession.evaluation.overallScore)) {
          hrScore = Math.round(hrSession.evaluation.overallScore);
        } else if (hrSession.questions && Array.isArray(hrSession.questions)) {
          const qScores = hrSession.questions
            .filter((q: any) => typeof q.response?.questionScore === 'number' && !isNaN(q.response.questionScore))
            .map((q: any) => q.response.questionScore);
          if (qScores.length > 0) {
            const sum = qScores.reduce((a: number, b: number) => a + b, 0);
            hrScore = Math.round(sum / qScores.length);
          }
        }
      }

      if (snap) {
        const existingHrScore =
          snap.stages?.hr?.scorePercentage ??
          snap.stages?.hr?.analysis?.overallScore ??
          snap.scoreBreakdown?.hrScore ??
          snap.hrAnalysis?.communicationScore ??
          hrScore;

        const effectiveHrScore = typeof existingHrScore === 'number' && !isNaN(existingHrScore) ? Math.round(existingHrScore) : hrScore;

        if (effectiveHrScore !== null) {
          if (!snap.stages) snap.stages = {};
          if (!snap.stages.hr) snap.stages.hr = {};
          snap.stages.hr.scorePercentage = effectiveHrScore;
          snap.stages.hr.overallScore = effectiveHrScore;
          snap.stages.hr.status = snap.stages.hr.status || (effectiveHrScore > 0 ? 'COMPLETED' : hrStatus);

          if (!snap.stages.hr.analysis) snap.stages.hr.analysis = {};
          snap.stages.hr.analysis.overallScore = effectiveHrScore;
          snap.stages.hr.analysis.scorePercentage = effectiveHrScore;
          snap.stages.hr.analysis.communicationScore = snap.stages.hr.analysis.communicationScore ?? effectiveHrScore;

          if (!snap.scoreBreakdown) snap.scoreBreakdown = {};
          if (snap.scoreBreakdown.hrScore == null) snap.scoreBreakdown.hrScore = effectiveHrScore;
        }

        return {
          ...inv,
          hrScore: effectiveHrScore,
          hrStatus: snap.stages?.hr?.status || hrStatus,
          session: {
            ...session,
            reportSnapshot: snap,
          },
        };
      }

      return {
        ...inv,
        hrScore,
        hrStatus,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Failed to fetch candidate interviews:', err);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// Placeholders for complex orchestrator API logic
app.post('/:id/start', async (req, res) => {
  res.json({ message: 'Interview Started via SessionService' });
});

app.post('/:id/heartbeat', async (req, res) => {
  res.json({ message: 'Heartbeat acknowledged via HeartbeatService' });
});

app.get('/:id/timeline', async (req, res) => {
  res.json({ timeline: [] });
});

// Focus Violation Persistence
app.post('/:id/focus-violation', async (req, res) => {
  try {
    const { id } = req.params;
    const { violationId, durationMs, visibilityState, hasFocus } = req.body;
    
    if (!violationId || typeof durationMs !== 'number') {
      return res.status(400).json({ error: 'Invalid violation payload' });
    }

    const session = await prisma.interviewSession.findUnique({
      where: { interviewId: id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    await prisma.interviewFocusViolation.upsert({
      where: { violationId },
      update: {},
      create: {
        sessionId: session.id,
        violationId,
        durationMs,
        visibilityState: visibilityState || 'unknown',
        hasFocus: !!hasFocus,
      }
    });

    res.json({ success: true, message: 'Violation recorded' });
  } catch (err: any) {
    console.error('Failed to record focus violation:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Real AI Follow-up Integration
app.post('/:id/ai/follow-up', async (req, res) => {
  try {
    const { conversationHistory } = req.body;
    const apiKey = process.env.LLM_API_KEY;
    const provider = process.env.LLM_PROVIDER || 'OPENAI';
    
    if (!apiKey) {
      return res.json({ 
        available: false, 
        message: 'AI Interviewer is not configured.', 
        followUp: null 
      });
    }

    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
       return res.status(400).json({
         available: false,
         message: 'Invalid conversation history.',
         followUp: null
       });
    }

    const url = provider === 'GROQ' 
      ? 'https://api.groq.com/openai/v1/chat/completions' 
      : 'https://api.openai.com/v1/chat/completions';
      
    // Map conversation history to LLM messages
    const messages = [
      { role: 'system', content: 'You are an expert HR and behavioral interviewer. Ask a short, focused follow-up question (max 2 sentences) to dig deeper into the candidate\'s last response based on the conversation history. Do not evaluate them or say "good answer", just ask the question.' }
    ];

    conversationHistory.forEach((msg: any) => {
      messages.push({
        role: msg.role === 'candidate' ? 'user' : 'assistant',
        content: msg.content
      });
    });

    const aiRes = await axios.post(url, {
      model: provider === 'GROQ' ? (process.env.GROQ_MODEL || 'qwen/qwen3.6-27b') : 'gpt-3.5-turbo',
      messages,
      max_tokens: 150,
      temperature: 0.7
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });

    let content = aiRes.data?.choices?.[0]?.message?.content;
    if (content) {
      content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }
    
    if (!content) {
      return res.json({
        available: false,
        message: 'AI Interviewer returned an invalid response. Please try again.',
        followUp: null
      });
    }

    res.json({
      available: true,
      followUp: content.trim()
    });
  } catch (error: any) {
    // Only log the message, not the full error/keys
    console.error('LLM Error:', error.response?.status, error.response?.statusText || error.message);
    res.status(500).json({ 
      available: false, 
      message: 'AI Interviewer is temporarily unavailable.', 
      followUp: null 
    });
  }
});

// ─── Practice Session Creation ────────────────────────────────────────────────

import { InterviewSessionService } from './services/InterviewSessionService';

app.post('/practice', async (req, res) => {
  try {
    const identityId = req.headers['x-identity-id'] as string || 'anonymous';
    const result = await InterviewSessionService.startPracticeSession(identityId);
    res.json(result);
  } catch (err: any) {
    console.error('Failed to create practice session:', err);
    res.status(500).json({ error: 'Failed to create practice session' });
  }
});

// ─── Questions (Persistent Assignment) ───────────────────────────────────────

app.get('/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const isPractice = id.startsWith('practice-');

    // Load persisted assignment if it exists
    if (!isPractice) {
      try {
        const persisted = await (prisma as any).interviewRoundAssignment.findMany({
          where: { interviewId: id },
          orderBy: [{ round: 'asc' }, { position: 'asc' }],
        });
        if (persisted.length > 0) {
          const byRound = (round: string) => persisted.filter((r: any) => r.round === round);
          const hydrateRound = async (refs: any[]) =>
            (await Promise.all(refs.map((r: any) => fetchQuestion(r.questionId).catch(() => null)))).filter(Boolean);
          const [apt, cod, hr] = await Promise.all([
            hydrateRound(byRound('APTITUDE')),
            hydrateRound(byRound('CODING')),
            hydrateRound(byRound('HR')),
          ]);
          console.log(`[Questions] Restored persisted assignment for session ${id}: apt=${apt.length} cod=${cod.length} hr=${hr.length}`);
          return res.json({ success: true, data: { aptitude: apt, coding: cod, hr } });
        }
      } catch {
        // Fall through to fresh assignment if table missing
      }
    }

    // Fresh assignment
    let aptQuestions: any[] = [];
    let codQuestions: any[] = [];
    let hrQuestions: any[] = [];

    // Check if this interview is linked to an Assessment Template
    let template: any = null;
    if (!isPractice) {
      try {
        const interview = await prisma.interview.findUnique({ where: { id } });
        if (interview?.templateId) {
          template = await prisma.interviewTemplate.findUnique({
            where: { id: interview.templateId },
            include: { questions: { orderBy: { order: 'asc' } } },
          });
        }
      } catch (err: any) {
        console.warn('[Questions] Could not check interview template:', err.message);
      }
    }

    const selectionMode = template?.defaultConfiguration?.selectionMode || 'RANDOM';

    if (template && selectionMode === 'MANUAL' && template.questions?.length > 0) {
      // MANUAL MODE: Load the exact faculty-selected questions from the template
      console.log(`[Questions] Loading MANUAL template questions for session ${id} (Template: ${template.name})`);
      const hydrated = (
        await Promise.all(template.questions.map((r: any) => fetchQuestion(r.questionId).catch(() => null)))
      ).filter(Boolean);

      aptQuestions = hydrated.filter((q: any) => q.questionType === 'APTITUDE');
      codQuestions = hydrated.filter((q: any) => q.questionType === 'CODING');
      hrQuestions = hydrated.filter((q: any) => q.questionType === 'HR');

      if (hrQuestions.length === 0) {
        const hrCfg = template.defaultConfiguration?.hrConfig;
        hrQuestions = [
          {
            id: hrCfg?.initialQuestionId || 'hr-conversational-default',
            title: hrCfg?.initialPrompt || 'Tell me about yourself, your background, and why you are interested in this software engineering role.',
            description: 'Conversational HR & Behavioral evaluation',
            questionType: 'HR',
            difficulty: 'EASY',
            category: 'HR & Behavioral',
          },
        ];
      }
    } else {
      // RANDOM MODE: 5 Curated Aptitude + (1 Easy + 1 Medium/Hard) Coding + 1 HR Conversational
      console.log(`[Questions] Generating RANDOM curated questions for session ${id}`);
      const [aptRes, codRes, hrRes] = await Promise.all([
        axios.get('http://localhost:3005/?questionType=APTITUDE&limit=100'),
        axios.get('http://localhost:3005/?questionType=CODING&limit=100'),
        axios.get('http://localhost:3005/?questionType=HR&limit=20'),
      ]);

      const isCurated = (q: any) => q.source?.name?.startsWith('Curated') || q.isCurated === true;
      const isExecutable = (q: any) => {
        const tc = q.metadata?.jsonPayload?.testCases;
        return !!(tc && tc.length > 0);
      };

      const allApt = (aptRes.data?.data || []).filter(isCurated);
      const allCod = (codRes.data?.data || []).filter((q: any) => isCurated(q) && isExecutable(q));
      const allHr = (hrRes.data?.data || []).filter(isCurated);

      const seed = id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);

      // Aptitude: Exactly 5 random questions
      aptQuestions = seededShuffle(allApt, seed).slice(0, 5);

      // Coding: Exactly 1 Easy + 1 Medium/Hard
      const easyCoding = allCod.filter((q: any) => q.difficulty === 'EASY');
      const medHardCoding = allCod.filter((q: any) => q.difficulty === 'MEDIUM' || q.difficulty === 'HARD');

      const selectedEasy: any = seededShuffle(easyCoding.length > 0 ? easyCoding : allCod, seed + 1)[0];
      const remainingForSecond: any[] = (medHardCoding.length > 0 ? medHardCoding : allCod).filter((q: any) => q.id !== selectedEasy?.id);
      const selectedMedHard: any = seededShuffle(remainingForSecond, seed + 2)[0] || allCod.find((q: any) => q.id !== selectedEasy?.id);

      codQuestions = [selectedEasy, selectedMedHard].filter(Boolean);

      // HR: Exactly 1 Conversational prompt
      hrQuestions = seededShuffle(allHr, seed + 3).slice(0, 1);
    }

    console.log(`[Questions] Assignment for ${id}: apt=${aptQuestions.length} cod=${codQuestions.length} hr=${hrQuestions.length}`);

    // Persist assignment to guarantee idempotency on refresh/resume
    if (!isPractice) {
      try {
        const records: any[] = [];
        aptQuestions.forEach((q: any, i: number) =>
          records.push({ interviewId: id, questionId: q.id, questionRefId: q.id, round: 'APTITUDE', position: i })
        );
        codQuestions.forEach((q: any, i: number) =>
          records.push({ interviewId: id, questionId: q.id, questionRefId: q.id, round: 'CODING', position: i })
        );
        hrQuestions.forEach((q: any, i: number) =>
          records.push({ interviewId: id, questionId: q.id, questionRefId: q.id, round: 'HR', position: i })
        );
        await (prisma as any).interviewRoundAssignment.createMany({ data: records, skipDuplicates: true });
        console.log(`[Questions] Persisted ${records.length} assignments for session ${id}`);
      } catch (dbErr: any) {
        console.warn('[Questions] Could not persist assignment:', dbErr.message);
      }
    }

    res.json({ success: true, data: { aptitude: aptQuestions, coding: codQuestions, hr: hrQuestions } });
  } catch (error: any) {
    console.error('Failed to fetch session questions:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch session questions' });
  }
});

// ─── RUN (sample test cases, no persist) ─────────────────────────────────────

app.post('/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const isPractice = id.startsWith('practice-');
    
    // Check finalization
    if (!isPractice) {
      const session = await prisma.interviewSession.findUnique({ where: { interviewId: id } });
      if (session?.finalizedAt) return res.status(403).json({ success: false, errorType: 'SESSION_FINALIZED', message: 'Session is finalized' });
    }

    let clientDisconnected = false;
    req.on('close', () => { clientDisconnected = true; });

    console.log(`[RUN] session=${id} | lang=${req.body.languageId} | ref=${req.body.questionRefId}`);
    const { payload, questionMeta } = await buildExecutionPayload(req.body, isPractice ? null : id, 'RUN');
    const result = await proxyToJudge(payload, req.headers['x-identity-id'] as string);
    console.log(`[RUN] success=${result.success} | status=${result.status?.description} | results=${result.results?.length}`);
    
    if (clientDisconnected) {
      console.log(`[RUN] Client disconnected, skipping for session=${id}`);
      return;
    }

    // RUN does NOT record execution attempts or affect scoring
    res.status(200).json(result);
  } catch (error: any) {
    const down = error.response?.data;
    if (down) return res.status(200).json(down);
    console.error('[RUN] Error:', error.message);
    res.status(200).json({ success: false, errorType: 'COMPILER_SERVICE_UNAVAILABLE', message: error.message });
  }
});

// ─── SUBMIT (all test cases + persist score) ──────────────────────────────────

app.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const isPractice = id.startsWith('practice-');

    if (!isPractice) {
      const session = await prisma.interviewSession.findUnique({ where: { interviewId: id } });
      if (session?.finalizedAt) return res.status(403).json({ success: false, errorType: 'SESSION_FINALIZED', message: 'Session is finalized' });
    }

    let clientDisconnected = false;
    req.on('close', () => { clientDisconnected = true; });

    console.log(`[SUBMIT] session=${id} | lang=${req.body.languageId} | ref=${req.body.questionRefId}`);
    const { payload, questionMeta } = await buildExecutionPayload(req.body, isPractice ? null : id, 'SUBMIT');
    const result = await proxyToJudge(payload, req.headers['x-identity-id'] as string);
    console.log(`[SUBMIT] success=${result.success} | score=${result.score}/${result.totalScore} | passed=${result.passedCount}/${result.totalCount}`);
    
    if (clientDisconnected) {
      console.log(`[SUBMIT] Client disconnected, skipping recordExecution for session=${id}`);
      return;
    }

    if (!isPractice) {
      await recordExecution(id, req.body.questionRefId, req.body.languageId, 'SUBMIT', req.body.sourceCode, result, questionMeta);
    }

    res.status(200).json(result);
  } catch (error: any) {
    const down = error.response?.data;
    if (down) return res.status(200).json(down);
    console.error('[SUBMIT] Error:', error.message);
    res.status(200).json({ success: false, errorType: 'COMPILER_SERVICE_UNAVAILABLE', message: error.message });
  }
});

// ─── Legacy Execute (backwards-compat) ───────────────────────────────────────

app.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const isPractice = id.startsWith('practice-');
    const runMode: 'RUN' | 'SUBMIT' = req.body.runMode || 'SUBMIT';

    console.log(`[EXECUTE] session=${id} | mode=${runMode} | lang=${req.body.languageId}`);
    const { payload, questionMeta } = await buildExecutionPayload(req.body, isPractice ? null : id, runMode);
    const result = await proxyToJudge(payload, req.headers['x-identity-id'] as string);

    if (!isPractice && runMode === 'SUBMIT') {
      try {
        await recordExecution(id, req.body.questionRefId, req.body.languageId, 'SUBMIT', req.body.sourceCode, result, questionMeta);
      } catch (recErr: any) {
        console.warn(`[EXECUTE] Failed to record execution:`, recErr.message);
      }
    }

    if (!res.headersSent) {
      res.status(200).json(result);
    }
  } catch (error: any) {
    const down = error.response?.data;
    if (down && !res.headersSent) return res.status(200).json(down);
    console.error('[EXECUTE] Error:', error.message);
    if (!res.headersSent) {
      res.status(200).json({ success: false, errorType: 'COMPILER_SERVICE_UNAVAILABLE', message: error.message });
    }
  }
});

// ─── ROUND TELEMETRY PERSISTENCE ─────────────────────────────────────────────

app.post('/:id/aptitude', async (req, res) => {
  try {
    const { id } = req.params;
    const telemetry = req.body;
    await prisma.interviewHistory.create({
      data: {
        interviewId: id,
        event: 'APTITUDE_SUBMIT',
        details: telemetry
      }
    });
    res.json({ success: true, message: 'Aptitude results recorded' });
  } catch (err: any) {
    console.error('Failed to record aptitude results:', err.message);
    res.status(500).json({ error: 'Failed to record aptitude results' });
  }
});

app.post('/:id/hr', async (req, res) => {
  try {
    const { id } = req.params;
    const telemetry = req.body;
    await prisma.interviewHistory.create({
      data: {
        interviewId: id,
        event: 'HR_COMPLETE',
        details: telemetry
      }
    });
    res.json({ success: true, message: 'HR interview results recorded' });
  } catch (err: any) {
    console.error('Failed to record HR results:', err.message);
    res.status(500).json({ error: 'Failed to record HR results' });
  }
});

// Note: /:id/finalize and /:id/report are handled by interviewSessionRouter via ReportService

// ─── COHORT ANALYTICS FOR FACULTY ────────────────────────────────────────────

app.post('/cohort-analytics', async (req, res) => {
  try {
    const { identityIds } = req.body;
    if (!Array.isArray(identityIds) || identityIds.length === 0) {
      return res.json({
        totalAssessments: 0,
        totalSubmissions: 0,
        averageScore: 0,
        hasEnoughPerformanceData: false,
        performanceTrend: [],
        recentActivity: [],
        studentStats: {},
      });
    }

    // 1. Fetch all interviews for these students
    const interviews = await prisma.interview.findMany({
      where: { identityId: { in: identityIds } },
      include: {
        session: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch execution records for sessions of these students
    const sessionIds = interviews.map((i) => i.session?.id).filter(Boolean) as string[];
    let executionRecords: any[] = [];
    if (sessionIds.length > 0) {
      try {
        executionRecords = await prisma.interviewExecutionRecord.findMany({
          where: { sessionId: { in: sessionIds } },
          orderBy: { timestamp: 'desc' },
        });
      } catch (err: any) {
        console.warn('[Cohort] Could not query execution records:', err.message);
      }
    }

    // 3. Compute real score metrics
    let totalScoreSum = 0;
    let validScoreCount = 0;
    const dateTrendMap: Record<string, { total: number; count: number }> = {};
    const studentStats: Record<
      string,
      {
        assessmentsCompleted: number;
        totalAssessments: number;
        totalSubmissions: number;
        scores: number[];
        lastActiveAt: string | null;
        failedSubmissions: number;
      }
    > = {};

    // Initialize stats for each student
    for (const id of identityIds) {
      studentStats[id] = {
        assessmentsCompleted: 0,
        totalAssessments: 0,
        totalSubmissions: 0,
        scores: [],
        lastActiveAt: null,
        failedSubmissions: 0,
      };
    }

    // Process interviews
    for (const iv of interviews) {
      const sStat = studentStats[iv.identityId];
      if (sStat) {
        sStat.totalAssessments++;
        if (
          !sStat.lastActiveAt ||
          new Date(iv.updatedAt).getTime() > new Date(sStat.lastActiveAt).getTime()
        ) {
          sStat.lastActiveAt = iv.updatedAt.toISOString();
        }

        if (iv.state === 'COMPLETED' && iv.session?.reportSnapshot) {
          sStat.assessmentsCompleted++;
          const report = iv.session.reportSnapshot as any;
          const score =
            report.overallScore ??
            report.metrics?.readinessIndex ??
            report.metrics?.compositeScore;
          if (typeof score === 'number' && !isNaN(score)) {
            sStat.scores.push(score);
            totalScoreSum += score;
            validScoreCount++;

            // Date trend
            const dateStr = new Date(iv.createdAt).toISOString().split('T')[0];
            if (!dateTrendMap[dateStr]) dateTrendMap[dateStr] = { total: 0, count: 0 };
            dateTrendMap[dateStr].total += score;
            dateTrendMap[dateStr].count++;
          }
        }
      }
    }

    // Process execution records
    const sessionToIdentity: Record<string, string> = {};
    for (const iv of interviews) {
      if (iv.session?.id) sessionToIdentity[iv.session.id] = iv.identityId;
    }

    for (const rec of executionRecords) {
      const studentId = sessionToIdentity[rec.sessionId];
      if (studentId && studentStats[studentId]) {
        studentStats[studentId].totalSubmissions++;
        if (rec.passedCount === 0 && rec.totalCount > 0) {
          studentStats[studentId].failedSubmissions++;
        }
        if (
          !studentStats[studentId].lastActiveAt ||
          new Date(rec.timestamp).getTime() > new Date(studentStats[studentId].lastActiveAt!).getTime()
        ) {
          studentStats[studentId].lastActiveAt = rec.timestamp.toISOString();
        }
      }
    }

    // Build performance trend (sorted by date)
    const performanceTrend = Object.entries(dateTrendMap)
      .map(([date, data]) => ({
        date,
        averageScore: Math.round((data.total / data.count) * 10) / 10,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build recent activities list (up to 10 latest)
    const recentActivity: any[] = [];
    for (const iv of interviews.slice(0, 10)) {
      recentActivity.push({
        id: iv.id,
        identityId: iv.identityId,
        type: 'INTERVIEW',
        title: iv.title || 'Practice Session',
        state: iv.state,
        timestamp: iv.createdAt.toISOString(),
      });
    }

    res.json({
      totalAssessments: interviews.length,
      totalSubmissions: executionRecords.length,
      averageScore:
        validScoreCount > 0 ? Math.round((totalScoreSum / validScoreCount) * 10) / 10 : 0,
      hasEnoughPerformanceData: validScoreCount > 0,
      performanceTrend,
      recentActivity,
      studentStats,
    });
  } catch (err: any) {
    console.error('Failed to get cohort analytics:', err);
    res.status(500).json({ error: 'Failed to compute cohort analytics' });
  }
});

// ─── INDIVIDUAL STUDENT ANALYTICS FOR FACULTY ────────────────────────────────

app.post('/student-analytics', async (req, res) => {
  try {
    const { identityId } = req.body;
    if (!identityId) {
      return res.status(400).json({ error: 'identityId is required' });
    }

    // 1. Fetch all interviews for this student
    const interviews = await prisma.interview.findMany({
      where: { identityId },
      include: {
        session: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch execution records for sessions of this student
    const sessionIds = interviews.map((i) => i.session?.id).filter(Boolean) as string[];
    let executionRecords: any[] = [];
    if (sessionIds.length > 0) {
      try {
        executionRecords = await prisma.interviewExecutionRecord.findMany({
          where: { sessionId: { in: sessionIds } },
          orderBy: { timestamp: 'desc' },
        });
      } catch (err: any) {
        console.warn('[StudentAnalytics] Could not query execution records:', err.message);
      }
    }

    // 3. Compute Interview Performance
    let totalScoreSum = 0;
    let validScoreCount = 0;
    const interviewList: any[] = [];

    for (const iv of interviews) {
      let score: number | null = null;
      if (iv.session?.reportSnapshot) {
        const report = iv.session.reportSnapshot as any;
        const rawScore =
          report.overallScore ??
          report.metrics?.readinessIndex ??
          report.metrics?.compositeScore;
        if (typeof rawScore === 'number' && !isNaN(rawScore)) {
          score = Math.round(rawScore * 10) / 10;
          totalScoreSum += score;
          validScoreCount++;
        }
      }

      interviewList.push({
        id: iv.id,
        title: iv.title || 'Technical Mock Interview',
        interviewType: iv.interviewType,
        difficulty: iv.difficulty,
        state: iv.state,
        score,
        startedAt: iv.session?.startedAt || iv.createdAt,
        finishedAt: iv.session?.finishedAt || null,
        createdAt: iv.createdAt,
      });
    }

    const completedCount = interviews.filter((i) => i.state === 'COMPLETED').length;
    const avgScore =
      validScoreCount > 0 ? Math.round((totalScoreSum / validScoreCount) * 10) / 10 : null;

    // 4. Compute Coding Performance
    let acceptedSubmissions = 0;
    const submissionList: any[] = [];

    for (const rec of executionRecords) {
      const isAccepted = rec.passedCount === rec.totalCount && rec.totalCount > 0;
      if (isAccepted) acceptedSubmissions++;

      submissionList.push({
        id: rec.id,
        questionTitle: rec.questionTitle || 'Practice Problem',
        language: rec.language,
        runMode: rec.runMode,
        status: rec.status,
        passedCount: rec.passedCount,
        totalCount: rec.totalCount,
        score: rec.score,
        timestamp: rec.timestamp,
      });
    }

    const totalSubmissions = executionRecords.length;
    const acceptanceRate =
      totalSubmissions > 0
        ? Math.round((acceptedSubmissions / totalSubmissions) * 1000) / 10
        : null;

    // 5. Build Unified Recent Activity
    const recentActivity: any[] = [];

    interviews.forEach((iv) => {
      recentActivity.push({
        id: `iv-${iv.id}`,
        type: 'INTERVIEW',
        title: iv.title || 'Practice Session',
        detail:
          iv.state === 'COMPLETED'
            ? `Completed session (${iv.interviewType})`
            : `Interview in progress (${iv.interviewType})`,
        status: iv.state,
        timestamp: iv.updatedAt.toISOString(),
      });
    });

    executionRecords.forEach((rec) => {
      recentActivity.push({
        id: `exec-${rec.id}`,
        type: 'CODE_SUBMISSION',
        title: rec.questionTitle || 'Coding Challenge',
        detail: `Executed ${rec.language} submission (${rec.passedCount}/${rec.totalCount} test cases passed)`,
        status: rec.status,
        timestamp: rec.timestamp.toISOString(),
      });
    });

    recentActivity.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({
      interviewPerformance: {
        totalInterviews: interviews.length,
        completedInterviews: completedCount,
        averageScore: avgScore,
        hasInterviewData: completedCount > 0 && avgScore !== null,
        interviews: interviewList,
      },
      codingPerformance: {
        totalSubmissions,
        acceptedSubmissions,
        acceptanceRate,
        hasCodingData: totalSubmissions > 0,
        submissions: submissionList,
      },
      recentActivity: recentActivity.slice(0, 15),
    });
  } catch (err: any) {
    console.error('Failed to get student analytics:', err);
    res.status(500).json({ error: 'Failed to compute student analytics' });
  }
});

// ─── Faculty Interview Templates Endpoints ────────────────────────────────────

import { TemplateService } from './services/TemplateService';

const requireFaculty = (req: any, res: any, next: any) => {
  const roleHeader = (req.headers['x-user-role'] as string) || '';
  const roles = roleHeader.split(',').map((r) => r.trim().toUpperCase());
  if (roles.includes('FACULTY') || roles.includes('ADMINISTRATOR') || roles.includes('ADMIN')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'Access denied: Only faculty members or administrators can access this resource.' },
  });
};

const templateRouter = express.Router();

// 1. List Templates
templateRouter.get('/', async (req, res) => {
  try {
    const roleHeader = (req.headers['x-user-role'] as string) || '';
    const roles = roleHeader.split(',').map((r) => r.trim().toUpperCase());
    const identityId = req.headers['x-identity-id'] as string;
    const isFaculty = roles.includes('FACULTY') || roles.includes('ADMINISTRATOR') || roles.includes('ADMIN');

    const templates = await TemplateService.listTemplates({
      search: req.query.search as string,
      status: req.query.status as string,
      interviewType: req.query.interviewType as string,
      isFaculty,
      identityId,
    });

    res.json({
      success: true,
      data: templates,
      total: templates.length,
    });
  } catch (err: any) {
    console.error('Failed to list templates:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// 2. Get Single Template by ID
templateRouter.get('/:id', async (req, res) => {
  try {
    const role = req.headers['x-user-role'] as string;
    const isFaculty = role === 'FACULTY' || role === 'ADMINISTRATOR';

    const template = await TemplateService.getTemplateById(req.params.id, isFaculty);
    if (!template) {
      return res.status(404).json({ success: false, error: { message: 'Interview template not found.' } });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (err: any) {
    console.error('Failed to get template:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// 3. Create Template
templateRouter.post('/', requireFaculty, async (req, res) => {
  try {
    const identityId = req.headers['x-identity-id'] as string;
    const created = await TemplateService.createTemplate(req.body, identityId);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Interview template created successfully.',
    });
  } catch (err: any) {
    console.error('Failed to create template:', err);
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// 4. Update Template
templateRouter.put('/:id', requireFaculty, async (req, res) => {
  try {
    const identityId = req.headers['x-identity-id'] as string;
    const updated = await TemplateService.updateTemplate(req.params.id, req.body, identityId);
    res.json({
      success: true,
      data: updated,
      message: 'Interview template updated successfully.',
    });
  } catch (err: any) {
    console.error('Failed to update template:', err);
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// 5. Duplicate Template
templateRouter.post('/:id/duplicate', requireFaculty, async (req, res) => {
  try {
    const identityId = req.headers['x-identity-id'] as string;
    const duplicated = await TemplateService.duplicateTemplate(req.params.id, identityId);
    res.status(201).json({
      success: true,
      data: duplicated,
      message: 'Interview template duplicated successfully.',
    });
  } catch (err: any) {
    console.error('Failed to duplicate template:', err);
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// 6. Delete / Archive Template
templateRouter.delete('/:id', requireFaculty, async (req, res) => {
  try {
    const result = await TemplateService.deleteTemplate(req.params.id);
    res.json({
      success: true,
      data: result,
      message: 'Interview template deleted successfully.',
    });
  } catch (err: any) {
    console.error('Failed to delete template:', err);
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// 7. Start Template Session (Idempotent for candidate)
templateRouter.post('/:id/start', async (req, res) => {
  try {
    const identityId = (req.headers['x-identity-id'] as string) || 'anonymous';
    const result = await InterviewSessionService.startTemplateSession(req.params.id, identityId);
    res.json(result);
  } catch (err: any) {
    console.error('Failed to start template session:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

app.use('/templates', templateRouter);

// ─── Faculty Interview Sessions Monitoring ────────────────────────────────────

import { FacultyInterviewService } from './services/FacultyInterviewService';

const facultySessionRouter = express.Router();

// List student interview sessions
facultySessionRouter.get('/', requireFaculty, async (req, res) => {
  try {
    const data = await FacultyInterviewService.listSessions({
      search: req.query.search as string,
      status: req.query.status as string,
      templateId: req.query.templateId as string,
      date: req.query.date as string,
    });
    res.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (err: any) {
    console.error('Failed to list faculty interview sessions:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// List student summaries (hierarchical Student -> Sessions)
facultySessionRouter.get('/students', requireFaculty, async (req, res) => {
  try {
    const data = await FacultyInterviewService.listStudentSummaries({
      search: req.query.search as string,
      status: req.query.status as string,
      templateId: req.query.templateId as string,
      date: req.query.date as string,
    });
    res.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (err: any) {
    console.error('Failed to list faculty student summaries:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Get single code execution detail for faculty review
facultySessionRouter.get('/executions/:executionId', requireFaculty, async (req, res) => {
  try {
    const data = await FacultyInterviewService.getExecutionDetail(req.params.executionId);
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Failed to get execution details:', err);
    res.status(404).json({ success: false, error: { message: err.message } });
  }
});

// Comprehensive Faculty Analytics
facultySessionRouter.get('/analytics', requireFaculty, async (req, res) => {
  try {
    const data = await FacultyInterviewService.getFacultyAnalytics({
      templateId: req.query.templateId as string,
      department: req.query.department as string,
      dateRange: req.query.dateRange as string,
      status: req.query.status as string,
    });
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Failed to get faculty analytics:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// List Completed Faculty Reports
facultySessionRouter.get('/reports', requireFaculty, async (req, res) => {
  try {
    const data = await FacultyInterviewService.getFacultyReports({
      search: req.query.search as string,
      templateId: req.query.templateId as string,
      interviewType: req.query.interviewType as string,
      date: req.query.date as string,
      scoreMin: req.query.scoreMin ? parseFloat(req.query.scoreMin as string) : undefined,
      scoreMax: req.query.scoreMax ? parseFloat(req.query.scoreMax as string) : undefined,
    });
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Failed to list faculty reports:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Get Single Completed Assessment Report Detail
facultySessionRouter.get('/reports/:id', requireFaculty, async (req, res) => {
  try {
    const data = await FacultyInterviewService.getFacultyReportDetail(req.params.id);
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Failed to get faculty report details:', err);
    res.status(404).json({ success: false, error: { message: err.message } });
  }
});

// Get single student session details
facultySessionRouter.get('/:id', requireFaculty, async (req, res) => {
  try {
    const data = await FacultyInterviewService.getSessionDetail(req.params.id);
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Failed to get session details:', err);
    res.status(404).json({ success: false, error: { message: err.message } });
  }
});

// ─── ADMIN PORTAL ROUTER ──────────────────────────────────────────────────
import { AdminService } from './services/AdminService';

const requireAdmin = (req: any, res: any, next: any) => {
  const roleHeader = (req.headers['x-user-role'] as string) || '';
  const roles = roleHeader.split(',').map((r) => r.trim().toUpperCase());
  if (roles.includes('ADMINISTRATOR') || roles.includes('ADMIN')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'Access denied: Administrator privileges required.' },
  });
};

const adminRouter = express.Router();

adminRouter.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const adminIdentityId = req.headers['x-identity-id'] as string;
    const data = await AdminService.getAdminDashboard(adminIdentityId);
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Failed to get admin dashboard:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

adminRouter.get('/system', requireAdmin, async (req, res) => {
  try {
    const data = await AdminService.getSystemHealth();
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Failed to get system health:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

adminRouter.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const data = await AdminService.getAnalytics({
      dateRange: req.query.dateRange as string,
      assessmentType: req.query.assessmentType as string,
    });
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Failed to get admin analytics:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

app.use('/admin', adminRouter);
app.use('/faculty/sessions', facultySessionRouter);
import { InterviewMediaService } from './services/InterviewMediaService';

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`Interview Service running on port ${PORT}`);

  // Run initial media cleanup on startup
  InterviewMediaService.cleanupExpiredMedia().catch((err) => {
    console.warn('[Server] Initial media cleanup warning:', err);
  });

  // Schedule periodic cleanup every 5 minutes (lightweight, idempotent)
  setInterval(() => {
    InterviewMediaService.cleanupExpiredMedia().catch((err) => {
      console.warn('[Server] Periodic media cleanup warning:', err);
    });
  }, 5 * 60 * 1000);
});
