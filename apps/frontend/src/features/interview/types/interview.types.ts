export type InterviewState =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'WAITING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'ARCHIVED';

export type QuestionType =
  | 'CODING'
  | 'SQL'
  | 'HR'
  | 'BEHAVIORAL'
  | 'TECHNICAL'
  | 'APTITUDE'
  | 'MCQ'
  | 'DESCRIPTIVE'
  | 'SCENARIO_BASED'
  | 'CASE_STUDY';

export interface InterviewQuestion {
  id: string; // Question Ref ID
  questionId: string; // Actual Question ID from Bank
  title: string;
  description: string;
  questionType: QuestionType;
  examples?: { input: string; output: string; explanation: string }[];
  constraints?: string[];
  hints?: string[];
}

export interface InterviewAnswer {
  questionRefId: string;
  value: string;
  savedAt?: string;
  isDraft: boolean;
}

export interface InterviewSessionData {
  sessionId: string;
  interviewId: string;
  title: string;
  state: InterviewState;
  remainingTime: number; // in seconds
  elapsedTime: number;
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, InterviewAnswer>;
  markedForReview: Record<string, boolean>;
}
