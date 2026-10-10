import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { InterviewSessionService } from '../services/InterviewSessionService';
import { AptitudeService } from '../services/AptitudeService';
import { CodingEvidenceService } from '../services/CodingEvidenceService';
import { HRInterviewService } from '../services/HRInterviewService';
import { InterviewMediaService } from '../services/InterviewMediaService';
import { ReportService } from '../services/ReportService';
import { ReportChatService } from '../services/ReportChatService';
import { PrismaClient } from '../generated/client';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max per answer recording
});

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export const interviewSessionRouter = express.Router();

const parseTokenPayload = (req: express.Request): any => {
  const token = (req.query?.token as string) || 
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined);
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return payload;
    }
  } catch (e) {
    // ignore
  }
  return null;
};

const getIdentityId = (req: express.Request): string => {
  if (req.headers['x-identity-id']) return req.headers['x-identity-id'] as string;
  const payload = parseTokenPayload(req);
  if (payload?.sub) return payload.sub;
  return (req.query?.identityId as string) || '';
};

const getUserRole = (req: express.Request): string => {
  if (req.headers['x-user-role']) return req.headers['x-user-role'] as string;
  const payload = parseTokenPayload(req);
  if (payload?.roles) return Array.isArray(payload.roles) ? payload.roles.join(',') : payload.roles;
  return (req.query?.role as string) || '';
};

// ─── 1. SESSION INITIALIZATION & RESUME ──────────────────────────────────────

// Start or resume generic Practice Session
interviewSessionRouter.post('/practice', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await InterviewSessionService.startPracticeSession(identityId);
    res.json(result);
  } catch (err: any) {
    console.error('Failed to start practice session:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Start or resume Published Template Session
interviewSessionRouter.post('/templates/:templateId/start', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await InterviewSessionService.startTemplateSession(
      req.params.templateId,
      identityId
    );
    res.json(result);
  } catch (err: any) {
    console.error('Failed to start template session:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ─── 2. SESSION RUNTIME STATE & QUESTIONS ────────────────────────────────────

// Get Session Runtime State (Restores active stage on refresh / reload)
interviewSessionRouter.get('/:id/state', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const state = await InterviewSessionService.getSessionState(req.params.id, identityId);
    res.json({ success: true, data: state });
  } catch (err: any) {
    console.error('Failed to get session state:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Get Locked Session Questions (Idempotent question loading)
interviewSessionRouter.get('/:id/questions', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const questions = await InterviewSessionService.getSessionQuestions(
      req.params.id,
      identityId
    );
    res.json({ success: true, data: questions });
  } catch (err: any) {
    console.error('Failed to get session questions:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ─── 2.5 TAB SWITCH & FOCUS INTEGRITY MONITORING ────────────────────────────
interviewSessionRouter.post('/:id/tab-switch', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const { eventType, leftAt, returnedAt, durationSeconds } = req.body;
    const interview = await InterviewSessionService.requireActiveSession(req.params.id, identityId);
    const sessionId = interview.session?.id || interview.id;

    if (eventType === 'SWITCH_AWAY') {
      const awayTime = leftAt ? new Date(leftAt) : new Date();
      // Throttle: avoid duplicate open switch-away event if one exists within 2 seconds
      const recent = await (prisma as any).interviewTabSwitchEvent.findFirst({
        where: {
          sessionId,
          returnedAt: null,
          leftAt: { gte: new Date(awayTime.getTime() - 2000) },
        },
      });

      if (!recent) {
        await (prisma as any).interviewTabSwitchEvent.create({
          data: {
            sessionId,
            interviewId: req.params.id,
            leftAt: awayTime,
          },
        });
      }
    } else if (eventType === 'RETURN') {
      const returnTime = returnedAt ? new Date(returnedAt) : new Date();
      // Find latest unclosed event for this session
      const openEvent = await (prisma as any).interviewTabSwitchEvent.findFirst({
        where: {
          sessionId,
          returnedAt: null,
        },
        orderBy: { leftAt: 'desc' },
      });

      if (openEvent) {
        const calculatedDuration = Math.max(
          1,
          Math.round((returnTime.getTime() - new Date(openEvent.leftAt).getTime()) / 1000)
        );
        const dur =
          typeof durationSeconds === 'number' && durationSeconds > 0
            ? durationSeconds
            : calculatedDuration;

        await (prisma as any).interviewTabSwitchEvent.update({
          where: { id: openEvent.id },
          data: {
            returnedAt: returnTime,
            durationSeconds: dur,
          },
        });
      } else {
        // Fallback: If no open event was found, create completed switch record
        const dur =
          typeof durationSeconds === 'number' && durationSeconds > 0
            ? durationSeconds
            : 1;
        const awayTime = leftAt ? new Date(leftAt) : new Date(returnTime.getTime() - dur * 1000);
        await (prisma as any).interviewTabSwitchEvent.create({
          data: {
            sessionId,
            interviewId: req.params.id,
            leftAt: awayTime,
            returnedAt: returnTime,
            durationSeconds: dur,
          },
        });
      }
    }

    const allSwitches = await (prisma as any).interviewTabSwitchEvent.findMany({
      where: {
        OR: [
          { interviewId: req.params.id },
          { sessionId },
        ],
      },
    });
    const tabSwitchesCount = allSwitches.length;
    const totalTimeAwaySeconds = allSwitches.reduce(
      (sum: number, ev: any) => sum + (ev.durationSeconds || 0),
      0
    );

    res.json({
      success: true,
      tabSwitchesCount,
      totalTimeAwaySeconds,
    });
  } catch (err: any) {
    console.error('Failed to record tab switch event:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      errorType: err.errorType || 'ERROR',
      error: err.message,
    });
  }
});

// ─── 3. STAGE 1: APTITUDE ROUND ──────────────────────────────────────────────

// Save individual answer during navigation
interviewSessionRouter.post('/:id/aptitude/answer', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const { questionId, selectedOptionIndex } = req.body;
    const result = await AptitudeService.saveAnswer(
      req.params.id,
      identityId,
      questionId,
      Number(selectedOptionIndex)
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Failed to save aptitude answer:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      errorType: err.errorType || 'ERROR',
      error: err.message,
    });
  }
});

// Complete Aptitude Stage
interviewSessionRouter.post('/:id/aptitude', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const answers = req.body?.answers || req.body || {};
    const result = await AptitudeService.completeAptitudeStage(
      req.params.id,
      identityId,
      answers
    );
    res.json(result);
  } catch (err: any) {
    console.error('Failed to complete aptitude stage:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      errorType: err.errorType || 'ERROR',
      error: err.message,
    });
  }
});

// ─── 4. STAGE 2: CODING ROUND ────────────────────────────────────────────────

// Coding RUN (sample/visible test cases, custom input, no hidden tests)
interviewSessionRouter.post('/:id/run', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await CodingEvidenceService.executeCode(
      req.params.id,
      identityId,
      req.body,
      'RUN'
    );
    res.json(result);
  } catch (err: any) {
    console.error('Coding RUN error:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      errorType: err.errorType || 'ERROR',
      message: err.message,
    });
  }
});

// Coding SUBMIT (evaluates all test cases, masked hidden test outputs)
interviewSessionRouter.post('/:id/submit', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await CodingEvidenceService.executeCode(
      req.params.id,
      identityId,
      req.body,
      'SUBMIT'
    );
    res.json(result);
  } catch (err: any) {
    console.error('Coding SUBMIT error:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      errorType: err.errorType || 'ERROR',
      message: err.message,
    });
  }
});

// Get Problem Attempt History
interviewSessionRouter.get('/:id/coding/attempts/:questionRefId', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const history = await CodingEvidenceService.getAttemptsHistory(
      req.params.id,
      identityId,
      req.params.questionRefId
    );
    res.json({ success: true, data: history });
  } catch (err: any) {
    console.error('Failed to get attempt history:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Complete Coding Stage (Validates at least 1 SUBMIT per assigned problem)
interviewSessionRouter.post('/:id/coding/complete', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await CodingEvidenceService.completeCodingStage(
      req.params.id,
      identityId
    );
    res.json(result);
  } catch (err: any) {
    console.error('Failed to complete coding stage:', err);
    res.status(err.statusCode || 400).json({
      success: false,
      errorType: err.errorType || 'VALIDATION_ERROR',
      error: err.message,
      unsubmittedProblems: err.unsubmittedProblems,
    });
  }
});

// ─── 5. STAGE 3: HR BEHAVIORAL AI INTERVIEW ROUND ────────────────────────────

// Initialize or resume HR session (returns questions pre-populated)
interviewSessionRouter.post('/:id/hr/session', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const { role } = req.body;
    const result = await HRInterviewService.initSession(req.params.id, identityId, role);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Failed to init HR session:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Get HR session details (status, questions, evaluation)
interviewSessionRouter.get('/:id/hr/session', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await HRInterviewService.getReport(req.params.id, identityId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Failed to get HR session:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Start the HR interview session
interviewSessionRouter.post('/:id/hr/start', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await HRInterviewService.startSession(req.params.id, identityId);
    res.json(result);
  } catch (err: any) {
    console.error('Failed to start HR session:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Submit a candidate answer transcript for a specific question
interviewSessionRouter.post('/:id/hr/response', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const { questionId, transcript, durationSeconds } = req.body;
    if (!questionId || !transcript) {
      return res.status(400).json({ success: false, error: 'questionId and transcript are required.' });
    }
    const result = await HRInterviewService.submitResponse(
      req.params.id,
      identityId,
      questionId,
      transcript,
      durationSeconds || 0
    );
    res.json(result);
  } catch (err: any) {
    console.error('Failed to submit HR response:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ─── 4. QUESTION-WISE ANSWER VIDEO EVIDENCE & MEDIA ENDPOINTS ──────────────

// Upload question-specific video/audio answer media blob
interviewSessionRouter.post('/:id/hr/media', upload.single('file'), async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const { questionId, durationSeconds, mimeType } = req.body;

    if (!questionId) {
      return res.status(400).json({ success: false, error: 'questionId is required.' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'Audio/video file buffer is required.' });
    }

    const result = await InterviewMediaService.saveAnswerMedia({
      interviewId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      identityId,
      questionId,
      durationSeconds: Number(durationSeconds) || 0,
      mimeType: mimeType || req.file.mimetype || 'video/webm',
      fileBuffer: req.file.buffer,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Failed to upload answer media:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Stream question answer video with full Range / seek support
interviewSessionRouter.get('/:id/media/:mediaId/stream', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const userRole = getUserRole(req);

    const { filePath, fileSizeBytes, mimeType } = await InterviewMediaService.getMediaForAccess(
      req.params.id,
      req.params.mediaId,
      identityId,
      userRole
    );

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSizeBytes - 1;

      if (start >= fileSizeBytes || end >= fileSizeBytes) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSizeBytes}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSizeBytes}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSizeBytes,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    console.error('Failed to stream answer media:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Download single question video file
interviewSessionRouter.get('/:id/media/:mediaId/download', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const userRole = getUserRole(req);

    const { media, filePath, fileSizeBytes, mimeType } = await InterviewMediaService.getMediaForAccess(
      req.params.id,
      req.params.mediaId,
      identityId,
      userRole
    );

    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const filename = `Question_${String(media.sequenceNumber || 1).padStart(2, '0')}_Answer.${ext}`;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', fileSizeBytes);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    console.error('Failed to download answer media:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Download full interview package ZIP (PDF report + all available answer videos)
interviewSessionRouter.get('/:id/package/download', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const userRole = getUserRole(req);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Interview_Report_${req.params.id}.zip"`);

    const zipStream = await InterviewMediaService.generateInterviewPackageZip(
      req.params.id,
      identityId,
      userRole
    );

    zipStream.pipe(res);
  } catch (err: any) {
    console.error('Failed to generate interview package ZIP:', err);
    if (!res.headersSent) {
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }
});

// Download PDF Report Document
interviewSessionRouter.get('/:id/report/pdf', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const userRole = getUserRole(req);

    const pdfBuffer = await InterviewMediaService.generateReportPdfBuffer(
      req.params.id,
      identityId,
      userRole
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="Interview_Report_${req.params.id}.pdf"`);

    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Failed to generate report PDF:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Backward compatibility: save recording path
interviewSessionRouter.post('/:id/hr/recording', async (req, res) => {
  try {
    const { questionId, hrSessionId, relativePath } = req.body;
    if (!questionId || !relativePath) {
      return res.status(400).json({ success: false, error: 'questionId and relativePath required.' });
    }
    await HRInterviewService.saveRecordingPath(hrSessionId, questionId, relativePath);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to save recording path:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Delete a candidate recording
interviewSessionRouter.delete('/:id/hr/recording/:responseId', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await HRInterviewService.deleteRecording(
      req.params.id,
      identityId,
      req.params.responseId
    );
    res.json(result);
  } catch (err: any) {
    console.error('Failed to delete HR recording:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Get HR conversation history (backward compat with old frontend)
interviewSessionRouter.get('/:id/hr/conversation', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await HRInterviewService.getConversation(req.params.id, identityId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Failed to get HR conversation:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Legacy: Process candidate response in multi-turn conversation
interviewSessionRouter.post('/:id/hr/message', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const { response, turnIndex } = req.body;
    const result = await HRInterviewService.processTurn(
      req.params.id,
      identityId,
      response,
      turnIndex
    );
    res.json(result);
  } catch (err: any) {
    console.error('Failed to process HR turn:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      errorType: err.errorType || 'ERROR',
      error: err.message,
    });
  }
});

// Get detailed HR report with all question-wise scores
interviewSessionRouter.get('/:id/hr/report', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await HRInterviewService.getReport(req.params.id, identityId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Failed to get HR report:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Complete HR Round & trigger full AI evaluation
interviewSessionRouter.post('/:id/hr/complete', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await HRInterviewService.completeHR(req.params.id, identityId);
    res.json(result);
  } catch (err: any) {
    console.error('Failed to complete HR round:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      errorType: err.errorType || 'ERROR',
      error: err.message,
    });
  }
});

// Legacy: Complete HR Stage (POST /:id/hr)
interviewSessionRouter.post('/:id/hr', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const result = await HRInterviewService.completeHR(req.params.id, identityId);
    res.json(result);
  } catch (err: any) {
    console.error('Failed to complete HR stage:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      errorType: err.errorType || 'ERROR',
      error: err.message,
    });
  }
});

// ─── 6. FINALIZATION & REPORT SNAPSHOT ───────────────────────────────────────

// Finalize session & generate report
interviewSessionRouter.post('/:id/finalize', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const completionReason =
      req.body?.completionReason ||
      (req.body?.reason === 'TIME_EXPIRED' ? 'TIME_EXPIRED' : undefined);

    const report = await ReportService.finalizeSession(
      req.params.id,
      identityId,
      req.body?.telemetry,
      completionReason
    );
    res.json(report);
  } catch (err: any) {
    console.error('Failed to finalize session:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      errorType: err.errorType || 'ERROR',
      error: err.message,
    });
  }
});

// Get Final Report
interviewSessionRouter.get('/:id/report', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const userRole = getUserRole(req);
    const report = await ReportService.getReport(req.params.id, identityId, userRole);
    res.json(report);
  } catch (err: any) {
    console.error('Failed to get report:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ─── 7. "ASK ABOUT MY INTERVIEW" AI CHATBOT ──────────────────────────────────

// Send query to report chatbot
interviewSessionRouter.post('/:id/report/chat', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const userRole = getUserRole(req);
    const { message, displayContent } = req.body;
    const response = await ReportChatService.handleChatQuery(
      req.params.id,
      identityId,
      message,
      displayContent,
      userRole
    );
    res.json({ success: true, data: response });
  } catch (err: any) {
    console.error('Failed to process report chat query:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
    });
  }
});

// Get report chat history
interviewSessionRouter.get('/:id/report/chat', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const userRole = getUserRole(req);
    const history = await ReportChatService.getChatHistory(req.params.id, identityId, userRole);
    res.json({ success: true, data: history });
  } catch (err: any) {
    console.error('Failed to get report chat history:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
    });
  }
});

// Validate practice question answer
interviewSessionRouter.post('/:id/report/chat/practice/:practiceQuestionId/answer', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const { answer } = req.body;
    const response = await ReportChatService.validatePracticeAnswer(
      req.params.id,
      identityId,
      req.params.practiceQuestionId,
      answer || ''
    );
    res.json({ success: true, data: response });
  } catch (err: any) {
    console.error('Failed to validate practice answer:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
    });
  }
});

// ─── 8. PHASE 5: INTERVIEW AUTOPSY ENGINE ─────────────────────────────────────
import { InterviewAutopsyService } from '../services/InterviewAutopsyService';

// Get candidate's latest Interview Autopsy (with staleness metadata)
interviewSessionRouter.get('/autopsy/latest', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const autopsy = await InterviewAutopsyService.getLatestAutopsy(identityId);
    res.json({ success: true, data: autopsy });
  } catch (err: any) {
    console.error('Failed to get latest autopsy:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

interviewSessionRouter.get('/autopsy', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const autopsy = await InterviewAutopsyService.getLatestAutopsy(identityId);
    res.json({ success: true, data: autopsy });
  } catch (err: any) {
    console.error('Failed to get latest autopsy:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Explicitly generate / refresh candidate's Interview Autopsy
interviewSessionRouter.post('/autopsy/generate', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const autopsy = await InterviewAutopsyService.generateAutopsy(identityId);
    res.json({ success: true, data: autopsy });
  } catch (err: any) {
    console.error('Failed to generate autopsy:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Get historical autopsy snapshots list
interviewSessionRouter.get('/autopsy/history', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const history = await InterviewAutopsyService.getAutopsyHistory(identityId);
    res.json({ success: true, data: history });
  } catch (err: any) {
    console.error('Failed to get autopsy history:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Get specific historical autopsy record
interviewSessionRouter.get('/autopsy/:autopsyId', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const autopsy = await InterviewAutopsyService.getAutopsyById(req.params.autopsyId, identityId);
    if (!autopsy) {
      return res.status(404).json({ success: false, error: 'Autopsy record not found.' });
    }
    res.json({ success: true, data: autopsy });
  } catch (err: any) {
    console.error('Failed to get autopsy detail:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ─── 9. PHASE 6: INTERVIEW DNA / SKILL GENOME ENGINE ─────────────────────────
import { InterviewDNAService } from '../services/InterviewDNAService';

// Get candidate's latest Interview DNA snapshot (with staleness metadata)
interviewSessionRouter.get('/dna/latest', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const dna = await InterviewDNAService.getLatestDNA(identityId);
    res.json({ success: true, data: dna });
  } catch (err: any) {
    console.error('Failed to get latest DNA:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

interviewSessionRouter.get('/dna', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const dna = await InterviewDNAService.getLatestDNA(identityId);
    res.json({ success: true, data: dna });
  } catch (err: any) {
    console.error('Failed to get latest DNA:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Explicitly generate / refresh candidate's Interview DNA
interviewSessionRouter.post('/dna/generate', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const dna = await InterviewDNAService.generateDNASnapshot(identityId);
    res.json({ success: true, data: dna });
  } catch (err: any) {
    console.error('Failed to generate DNA:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

interviewSessionRouter.post('/dna/analyze', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const dna = await InterviewDNAService.generateDNASnapshot(identityId);
    res.json({ success: true, data: dna });
  } catch (err: any) {
    console.error('Failed to analyze DNA:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// ─── 10. PHASE 7: PERSONALIZED IMPROVEMENT LOOP ENGINE ───────────────────────
import { PersonalizedImprovementEngine } from '../services/PersonalizedImprovementEngine';

// Get candidate's latest Personalized Improvement Plan (with staleness metadata)
interviewSessionRouter.get('/improvement-plan/latest', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const plan = await PersonalizedImprovementEngine.getLatestPlan(identityId);
    res.json({ success: true, data: plan });
  } catch (err: any) {
    console.error('Failed to get latest improvement plan:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

interviewSessionRouter.get('/improvement-plan', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const plan = await PersonalizedImprovementEngine.getLatestPlan(identityId);
    res.json({ success: true, data: plan });
  } catch (err: any) {
    console.error('Failed to get improvement plan:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

// Explicitly generate / refresh candidate's Personalized Improvement Plan
interviewSessionRouter.post('/improvement-plan/generate', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const plan = await PersonalizedImprovementEngine.generatePlan(identityId);
    res.json({ success: true, data: plan });
  } catch (err: any) {
    console.error('Failed to generate improvement plan:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

interviewSessionRouter.post('/improvement-plan/refresh', async (req, res) => {
  try {
    const identityId = getIdentityId(req);
    const plan = await PersonalizedImprovementEngine.generatePlan(identityId);
    res.json({ success: true, data: plan });
  } catch (err: any) {
    console.error('Failed to refresh improvement plan:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});





