import { PrismaClient, InterviewStateEnum } from '../generated/client';
import { StateMachineService } from './StateMachineService';
import { TimerEngineService } from './TimerEngineService';
import { EventType } from '@nm/types';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class SessionService {
  /**
   * Starts a new interview session and generates a lock.
   */
  static async startSession(interviewId: string, lockedByIp: string): Promise<any> {
    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview) throw new Error('Interview not found');

    StateMachineService.validateTransition(interview.state, InterviewStateEnum.RUNNING);

    const session = await prisma.interviewSession.create({
      data: {
        interviewId,
        startedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    await TimerEngineService.initializeTimer(session.id, 3600); // Default 1 hour

    await prisma.interviewLock.create({
      data: {
        sessionId: session.id,
        lockedBy: lockedByIp,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      },
    });

    await prisma.interview.update({
      where: { id: interviewId },
      data: { state: InterviewStateEnum.RUNNING },
    });

    await prisma.interviewTimeline.create({
      data: {
        interviewId,
        previousState: interview.state,
        newState: InterviewStateEnum.RUNNING,
        reason: 'Candidate clicked Start',
      },
    });

    await prisma.interviewEvent.create({
      data: {
        interviewId,
        eventType: EventType.INTERVIEW_STARTED,
        payload: { sessionId: session.id, startedAt: session.startedAt },
      },
    });

    return session;
  }

  /**
   * Generates an Interview Snapshot
   */
  static async createSnapshot(interviewId: string): Promise<any> {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: { session: { include: { timer: true, progress: true } } },
    });

    if (!interview || !interview.session) throw new Error('Active session not found');

    const snapshotCount = await prisma.interviewSnapshot.count({ where: { interviewId } });

    const snapshot = await prisma.interviewSnapshot.create({
      data: {
        interviewId,
        snapshotNumber: snapshotCount + 1,
        currentQuestionId: interview.session.progress?.currentQuestionId,
        progressPercent: interview.session.progress?.percentComplete || 0,
        remainingTime: interview.session.timer?.remainingTime || 0,
        state: interview.state,
      },
    });

    await prisma.interviewEvent.create({
      data: {
        interviewId,
        eventType: EventType.SNAPSHOT_CREATED,
        payload: { snapshotId: snapshot.id, snapshotNumber: snapshot.snapshotNumber },
      },
    });

    return snapshot;
  }
}
