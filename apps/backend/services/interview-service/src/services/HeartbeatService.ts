import { PrismaClient, InterviewStateEnum } from '../generated/client';
import { EventType } from '@nm/types';
import { StateMachineService } from './StateMachineService';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class HeartbeatService {
  private static readonly MAX_MISSED_HEARTBEAT_SECONDS = 300; // 5 minutes

  /**
   * Processes an incoming heartbeat from a candidate client.
   */
  static async ping(sessionId: string): Promise<void> {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { interview: true, timer: true },
    });

    if (!session || !session.timer) {
      throw new Error('Session or Timer not found');
    }

    // Must be in a running state to accept heartbeats
    if (session.interview.state !== InterviewStateEnum.RUNNING) {
      return;
    }

    const now = new Date();
    const lastHeartbeat = session.timer.heartbeatTimestamp || now;
    const diffSeconds = Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000);

    // Update timer engine
    await prisma.interviewTimer.update({
      where: { sessionId },
      data: {
        elapsedTime: { increment: diffSeconds },
        remainingTime: { decrement: diffSeconds },
        heartbeatTimestamp: now,
      },
    });

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: now },
    });
  }

  /**
   * Sweeper function to identify abandoned interviews and expire them.
   * Could be run on a cron job or scheduled worker.
   */
  static async sweepAbandonedSessions(): Promise<void> {
    const thresholdDate = new Date(Date.now() - this.MAX_MISSED_HEARTBEAT_SECONDS * 1000);

    const abandonedSessions = await prisma.interviewSession.findMany({
      where: {
        interview: {
          state: InterviewStateEnum.RUNNING,
        },
        lastActiveAt: {
          lt: thresholdDate,
        },
      },
      include: { interview: true },
    });

    for (const session of abandonedSessions) {
      try {
        StateMachineService.validateTransition(session.interview.state, InterviewStateEnum.EXPIRED);

        await prisma.interview.update({
          where: { id: session.interviewId },
          data: { state: InterviewStateEnum.EXPIRED },
        });

        await prisma.interviewTimeline.create({
          data: {
            interviewId: session.interviewId,
            previousState: session.interview.state,
            newState: InterviewStateEnum.EXPIRED,
            reason: 'Heartbeat timeout',
          },
        });

        await prisma.interviewEvent.create({
          data: {
            interviewId: session.interviewId,
            eventType: EventType.HEARTBEAT_MISSED,
            payload: { sessionId: session.id, lastActiveAt: session.lastActiveAt },
          },
        });
      } catch (error) {
        console.error(`Failed to expire session ${session.id}`, error);
      }
    }
  }
}
