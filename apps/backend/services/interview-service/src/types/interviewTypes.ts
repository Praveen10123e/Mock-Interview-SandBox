/**
 * Interview Module Type Definitions and Contracts
 */

export type InterviewStage =
  | 'NOT_STARTED'
  | 'APTITUDE_IN_PROGRESS'
  | 'APTITUDE_COMPLETED'
  | 'CODING_IN_PROGRESS'
  | 'CODING_COMPLETED'
  | 'HR_IN_PROGRESS'
  | 'HR_COMPLETED'
  | 'COMPLETED';

export type RoundStatus = 'LOCKED' | 'ACTIVE' | 'COMPLETED';

export interface RoundState {
  aptitude: RoundStatus;
  coding: RoundStatus;
  hr: RoundStatus;
  report: RoundStatus;
}

export interface AptitudeAnswerItem {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect?: boolean;
  answeredAt: string;
}

export interface AptitudeStageTelemetry {
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  completed: boolean;
  answers: Record<string, number>;
}

export interface CodingProblemProgress {
  questionId: string;
  questionTitle: string;
  difficulty: string;
  hasSubmitted: boolean;
  lastSubmitStatus?: string | null;
  lastSubmitScore?: number | null;
  testsPassed?: number;
  totalTests?: number;
  attemptsCount: number;
}

export interface CodingStageTelemetry {
  totalProblems: number;
  submittedProblemsCount: number;
  allSubmitted: boolean;
  completed: boolean;
  problems: Record<string, CodingProblemProgress>;
}

export interface HRMessage {
  id: string;
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
  turnIndex: number;
}

export interface HRStageTelemetry {
  initialQuestion: string;
  conversation: HRMessage[];
  followUpsCount: number;
  completed: boolean;
}

export interface SessionRuntimeState {
  id: string;
  interviewId: string;
  title: string;
  interviewType: string;
  difficulty: string;
  state: string;
  currentStage: InterviewStage;
  activeRound: 'aptitude' | 'coding' | 'hr' | 'report';
  roundState: RoundState;
  isFinalized: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  timeRemainingSeconds: number;
  expiresAt?: string | null;
  durationMinutes?: number;
  tabSwitchesCount?: number;
  totalTimeAwaySeconds?: number;
  completionReason?: string | null;
  serverTime?: string;
  aptitude: AptitudeStageTelemetry;
  coding: CodingStageTelemetry;
  hr: HRStageTelemetry;
  reportSnapshot?: any | null;
}
