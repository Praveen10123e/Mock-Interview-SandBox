import { InterviewStateEnum } from '../generated/client';

export class StateMachineError extends Error {
  constructor(
    public from: InterviewStateEnum,
    public to: InterviewStateEnum,
  ) {
    super(`Invalid transition from ${from} to ${to}`);
    this.name = 'StateMachineError';
  }
}

export class StateMachineService {
  private static readonly transitions: Record<InterviewStateEnum, InterviewStateEnum[]> = {
    DRAFT: [InterviewStateEnum.SCHEDULED, InterviewStateEnum.CANCELLED],
    SCHEDULED: [InterviewStateEnum.WAITING, InterviewStateEnum.CANCELLED],
    WAITING: [InterviewStateEnum.RUNNING, InterviewStateEnum.CANCELLED, InterviewStateEnum.EXPIRED],
    RUNNING: [
      InterviewStateEnum.PAUSED,
      InterviewStateEnum.COMPLETED,
      InterviewStateEnum.CANCELLED,
    ],
    PAUSED: [
      InterviewStateEnum.RUNNING,
      InterviewStateEnum.COMPLETED,
      InterviewStateEnum.CANCELLED,
    ],
    COMPLETED: [InterviewStateEnum.ARCHIVED],
    CANCELLED: [InterviewStateEnum.ARCHIVED],
    EXPIRED: [InterviewStateEnum.ARCHIVED],
    ARCHIVED: [],
  };

  /**
   * Validates if a transition is allowed according to the State Machine matrix.
   * @throws {StateMachineError} If the transition is not permitted.
   */
  static validateTransition(
    currentState: InterviewStateEnum,
    targetState: InterviewStateEnum,
  ): void {
    const allowed = this.transitions[currentState];
    if (!allowed.includes(targetState)) {
      throw new StateMachineError(currentState, targetState);
    }
  }

  /**
   * Returns whether a transition is allowed (boolean).
   */
  static canTransition(currentState: InterviewStateEnum, targetState: InterviewStateEnum): boolean {
    return this.transitions[currentState].includes(targetState);
  }
}
