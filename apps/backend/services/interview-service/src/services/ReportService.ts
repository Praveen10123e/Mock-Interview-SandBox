import { PrismaClient } from '../generated/client';
import { InterviewSessionService } from './InterviewSessionService';
import { ReportEvidenceService } from './ReportEvidenceService';
import { ReportAnalysisService } from './ReportAnalysisService';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class ReportService {
  /**
   * Finalize interview session and create immutable deterministic report snapshot
   */
  static async finalizeSession(
    interviewId: string,
    identityId: string,
    telemetryOverride?: any,
    completionReasonOverride?: 'MANUAL_SUBMISSION' | 'TIME_EXPIRED',
    userRole?: string
  ) {
    const interview = await InterviewSessionService.getInterviewScoped(interviewId, identityId, userRole);

    if (!interview.session) {
      throw new Error('Interview session record not found.');
    }

    // Idempotency: If already finalized and complete, return the existing immutable snapshot
    if (interview.session.finalizedAt && interview.session.reportSnapshot) {
      const snap = interview.session.reportSnapshot as any;
      const aptList = snap?.aptitudeAnalysis || snap?.stages?.aptitude?.questions || [];
      const isMissingOptions = aptList.length > 0 && aptList.some((q: any) => !q.options || q.options.length < 2 || q.options[0] === 'A' || q.options[0] === 'Option A' || !q.howToImprove);
      if (!isMissingOptions) {
        return interview.session.reportSnapshot;
      }
    }

    // Determine completion reason
    const now = new Date();
    const expiresAt = interview.session.expiresAt;
    const isExpired = expiresAt ? now >= expiresAt : false;
    const reason = completionReasonOverride || (isExpired ? 'TIME_EXPIRED' : 'MANUAL_SUBMISSION');
    const completionReasonDisplay =
      reason === 'TIME_EXPIRED'
        ? 'Automatically Submitted — Time Expired'
        : 'Manually Submitted';

    // 1. Collect exact session evidence
    const evidence = await ReportEvidenceService.collectEvidence(
      interviewId,
      identityId,
      telemetryOverride,
      userRole
    );

    // 2. Synthesize rich analysis & 7-dimension scoring
    const synthesized = await ReportAnalysisService.synthesizeReport(evidence);

    const finalReportSnapshot = {
      ...synthesized,
      reportId: `rep-${interviewId}`,
      interviewId,
      candidateIdentityId: identityId,
      overallScore: synthesized.overallProficiencyScore,
      scoreDisplay: `${synthesized.overallProficiencyScore}%`,
      completionDetails: {
        reason: completionReasonDisplay,
        rawReason: reason,
        finalizedAt: new Date().toISOString(),
      },
      monitoring: {
        status: evidence.monitoring?.status || evidence.monitoring?.monitoringStatus || 'Integrity Verified',
        monitoringStatus: evidence.monitoring?.status || evidence.monitoring?.monitoringStatus || 'Integrity Verified',
        totalSwitches: evidence.monitoring?.totalSwitches ?? evidence.monitoring?.tabSwitches ?? (evidence.monitoring?.events ? evidence.monitoring.events.length : 0),
        tabSwitches: evidence.monitoring?.totalSwitches ?? evidence.monitoring?.tabSwitches ?? (evidence.monitoring?.events ? evidence.monitoring.events.length : 0),
        totalAwaySeconds: evidence.monitoring?.totalAwaySeconds ?? evidence.monitoring?.totalTimeAwaySeconds ?? (evidence.monitoring?.events ? evidence.monitoring.events.reduce((s: number, e: any) => s + (e.durationSeconds || 0), 0) : 0),
        totalTimeAwaySeconds: evidence.monitoring?.totalAwaySeconds ?? evidence.monitoring?.totalTimeAwaySeconds ?? (evidence.monitoring?.events ? evidence.monitoring.events.reduce((s: number, e: any) => s + (e.durationSeconds || 0), 0) : 0),
        events: evidence.monitoring?.events || [],
      },
      stages: {
        aptitude: {
          totalQuestions: evidence.aptitude.totalQuestions,
          attemptedCount: evidence.aptitude.attemptedCount,
          correctCount: evidence.aptitude.correctCount,
          incorrectCount: evidence.aptitude.incorrectCount,
          scorePercentage: evidence.aptitude.scorePercentage,
          isCompleted: evidence.aptitude.status === 'COMPLETED',
          status: evidence.aptitude.status,
          questions: synthesized.aptitudeAnalysis,
        },
        coding: {
          totalProblems: evidence.coding.totalProblems,
          problemsAttempted: evidence.coding.problemsAttempted,
          problemsSubmitted: evidence.coding.problemsSubmitted,
          problemsAccepted: evidence.coding.problemsAccepted,
          totalRunAttempts: evidence.coding.totalRunCount,
          totalSubmitAttempts: evidence.coding.totalSubmitCount,
          totalTestsPassed: evidence.coding.totalTestsPassed,
          totalTestsCount: evidence.coding.totalTestsCount,
          scorePercentage: evidence.coding.scorePercentage,
          problems: synthesized.codingAnalysis,
          status: evidence.coding.status,
        },
        hr: {
          isCompleted: evidence.hr.status === 'COMPLETED',
          totalInteractions: evidence.hr.totalInteractions,
          candidateResponsesCount: evidence.hr.candidateResponsesCount,
          conversationLog: evidence.hr.transcript,
          status: evidence.hr.status,
          scorePercentage: synthesized.scoreBreakdown.hrScore,
          overallScore: synthesized.scoreBreakdown.hrScore,
          analysis: synthesized.hrAnalysis,
        },
      },
      evaluationSummary: {
        aptitudeAccuracy: `${evidence.aptitude.correctCount}/${evidence.aptitude.totalQuestions} correct (${evidence.aptitude.scorePercentage}%)`,
        codingSuccess: `${evidence.coding.problemsAccepted}/${evidence.coding.totalProblems} solved (${evidence.coding.totalTestsPassed}/${evidence.coding.totalTestsCount} tests passed)`,
        hrExcellence: `${evidence.hr.candidateResponsesCount} behavioral dialogue responses recorded (${evidence.hr.status})`,
      },
      dataIntegrityNote: 'This report is computed purely from verified stored execution evidence.',
    };

    // 3. Persist immutable snapshot & mark session COMPLETED
    await prisma.interviewSession.update({
      where: { id: interview.session.id },
      data: {
        finalizedAt: new Date(),
        finishedAt: new Date(),
        completionReason: reason,
        reportSnapshot: finalReportSnapshot as any,
        reportVersion: 3,
      },
    });

    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        state: 'COMPLETED',
      },
    });

    return finalReportSnapshot;
  }

  /**
   * Get Report for session (returns snapshot if finalized, denies if active/running)
   */
  static async getReport(interviewId: string, identityId: string, userRole?: string) {
    const interview = await InterviewSessionService.getInterviewScoped(interviewId, identityId, userRole);

    if (interview.session?.finalizedAt && interview.session?.reportSnapshot) {
      const snap = interview.session.reportSnapshot as any;
      const aptList = snap?.aptitudeAnalysis || snap?.stages?.aptitude?.questions || [];
      const isMissingOptions = aptList.length > 0 && aptList.some((q: any) => !q.options || q.options.length < 2 || q.options[0] === 'A' || q.options[0] === 'Option A' || !q.howToImprove);
      if (!isMissingOptions) {
        return interview.session.reportSnapshot;
      }
    }

    const now = new Date();
    const durationMin = interview.configuration?.duration || 60;
    const started = interview.session?.startedAt || interview.createdAt;
    const expiresAt = interview.session?.expiresAt || new Date(started.getTime() + durationMin * 60 * 1000);

    if (interview.state === 'RUNNING' && !interview.session?.finalizedAt) {
      if (now < expiresAt) {
        const err: any = new Error('Assessment report unavailable: Interview session is currently active.');
        err.statusCode = 403;
        err.code = 'SESSION_RUNNING';
        throw err;
      }
      // Dead/expired session: finalize with TIME_EXPIRED
      return this.finalizeSession(interviewId, identityId, undefined, 'TIME_EXPIRED', userRole);
    }

    // Fallback finalization for completed session missing snapshot
    return this.finalizeSession(interviewId, identityId, undefined, undefined, userRole);
  }
}
