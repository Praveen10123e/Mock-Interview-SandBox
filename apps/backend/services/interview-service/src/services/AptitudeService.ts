import { PrismaClient } from '../generated/client';
import { InterviewSessionService, fetchQuestionMeta } from './InterviewSessionService';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class AptitudeService {
  /**
   * Save individual answer selection during navigation
   */
  static async saveAnswer(
    interviewId: string,
    identityId: string,
    questionId: string,
    selectedOptionIndex: number
  ) {
    // 1. Centralized SESSION_FINALIZED guard
    await InterviewSessionService.requireActiveSession(interviewId, identityId);

    // 2. Persist answer event
    await prisma.interviewHistory.create({
      data: {
        interviewId,
        event: 'APTITUDE_ANSWER_SAVE',
        details: {
          questionId,
          selectedOptionIndex,
          answeredAt: new Date().toISOString(),
        },
      },
    });

    return { success: true, questionId, selectedOptionIndex };
  }

  /**
   * Complete Aptitude Stage: verifies answers against authoritative question key
   */
  static async completeAptitudeStage(
    interviewId: string,
    identityId: string,
    submittedAnswers: Record<string, number>
  ) {
    // 1. Centralized SESSION_FINALIZED guard
    await InterviewSessionService.requireActiveSession(interviewId, identityId);

    // 2. Load locked questions for this session
    const { aptitude } = await InterviewSessionService.getSessionQuestions(interviewId, identityId);

    // 3. Load answers from realtime history + batch submission
    const history = await prisma.interviewHistory.findMany({
      where: { interviewId },
      orderBy: { timestamp: 'asc' },
    });

    const savedAnswers: Record<string, number> = {};
    history.forEach((h) => {
      if (h.event === 'APTITUDE_ANSWER_SAVE' && h.details) {
        const d = h.details as any;
        if (d.questionId && typeof d.selectedOptionIndex === 'number') {
          savedAnswers[d.questionId] = d.selectedOptionIndex;
        }
      }
    });

    const submittedMap = (submittedAnswers && typeof submittedAnswers === 'object' && submittedAnswers.answers) 
      ? submittedAnswers.answers 
      : (submittedAnswers && typeof submittedAnswers === 'object' ? submittedAnswers : {});

    const answersMap: Record<string, any> = {
      ...savedAnswers,
      ...(submittedMap as Record<string, any>),
    };

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    const total = aptitude.length;

    aptitude.forEach((rawQ: any) => {
      const qId = rawQ.id;
      const selected = answersMap[qId];
      const correctIdx = typeof rawQ.correctAnswer === 'number' ? rawQ.correctAnswer : 0;

      if (selected === undefined || selected === null) {
        unanswered++;
      } else if (Number(selected) === correctIdx) {
        correct++;
      } else {
        incorrect++;
      }
    });

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const telemetry = {
      total,
      attempted: Object.keys(answersMap).length,
      correct,
      incorrect,
      unanswered,
      score,
      completed: true,
      answers: answersMap,
      completedAt: new Date().toISOString(),
    };

    // 3. Record stage completion event
    await prisma.interviewHistory.create({
      data: {
        interviewId,
        event: 'APTITUDE_SUBMIT',
        details: telemetry,
      },
    });

    return {
      success: true,
      stage: 'APTITUDE_COMPLETED',
      telemetry,
    };
  }
}
