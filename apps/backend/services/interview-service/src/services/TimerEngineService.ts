import { PrismaClient, InterviewTimer, InterviewSession } from '../generated/client';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class TimerEngineService {
  /**
   * Initializes the timer when a session is created.
   */
  static async initializeTimer(
    sessionId: string,
    initialDurationSeconds: number,
  ): Promise<InterviewTimer> {
    return prisma.interviewTimer.create({
      data: {
        sessionId,
        remainingTime: initialDurationSeconds,
        elapsedTime: 0,
        pausedTime: 0,
        resumeCount: 0,
        heartbeatTimestamp: new Date(),
      },
    });
  }

  /**
   * Updates the timer upon resuming an interview.
   */
  static async resumeTimer(
    sessionId: string,
    pausedDurationSeconds: number,
  ): Promise<InterviewTimer> {
    return prisma.interviewTimer.update({
      where: { sessionId },
      data: {
        resumeCount: { increment: 1 },
        pausedTime: { increment: pausedDurationSeconds },
        heartbeatTimestamp: new Date(),
      },
    });
  }

  /**
   * Records a heartbeat and recalculates remaining time.
   */
  static async recordHeartbeat(
    sessionId: string,
    additionalElapsedSeconds: number,
  ): Promise<InterviewTimer> {
    return prisma.interviewTimer.update({
      where: { sessionId },
      data: {
        elapsedTime: { increment: additionalElapsedSeconds },
        remainingTime: { decrement: additionalElapsedSeconds },
        heartbeatTimestamp: new Date(),
      },
    });
  }

  /**
   * Checks if the time has run out.
   */
  static async checkTimeout(sessionId: string): Promise<boolean> {
    const timer = await prisma.interviewTimer.findUnique({
      where: { sessionId },
    });
    if (!timer) return true;
    return timer.remainingTime <= 0;
  }
}
